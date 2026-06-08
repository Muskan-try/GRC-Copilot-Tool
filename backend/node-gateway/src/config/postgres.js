require('dotenv').config();
const { Pool } = require('pg');
const logger = require('./logger');

const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT) || 5432,
      database: process.env.PG_DATABASE || 'grc_copilot',
      user: process.env.PG_USER || 'grc_user',
      password: process.env.PG_PASSWORD || '',
    };

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error:', err);
});

async function connectPostgres() {
  try {
    const client = await pool.connect();
    logger.info('PostgreSQL connected successfully');
    client.release();
  } catch (err) {
    logger.error('PostgreSQL connection failed:', err);
    throw err;
  }
}

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    logger.error('Query error:', { text, error: err.message });
    throw err;
  }
}

async function runMigrations() {
  logger.info('Running database migrations...');

  // Enable UUID extension
  await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  // Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'team_member' CHECK (role IN ('admin', 'org_admin', 'team_lead', 'team_member')),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Update existing users role check constraint if needed
  try {
    await query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
    await query(`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'org_admin', 'team_lead', 'team_member'))`);
  } catch (e) {
    logger.warn('Failed to update users_role_check constraint:', e.message);
  }

  // Organizations table
  await query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      industry VARCHAR(100),
      region VARCHAR(255),
      employee_range VARCHAR(50),
      contact_name VARCHAR(255),
      frameworks TEXT[] DEFAULT '{}',
      analysis_depth VARCHAR(50) DEFAULT 'normal' CHECK (analysis_depth IN ('normal', 'intermediate', 'deep')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  try {
    await query(`ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_analysis_depth_check`);
  } catch (e) {
    logger.warn('Failed to drop organizations_analysis_depth_check constraint:', e.message);
  }

  // Assessments table
  await query(`
    CREATE TABLE IF NOT EXISTS assessments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      framework VARCHAR(100) NOT NULL,
      analysis_depth VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('setup', 'initialized', 'in_progress', 'submitted', 'analyzing', 'complete', 'failed')),
      compliance_score DECIMAL(5,2),
      risk_level VARCHAR(50),
      total_questions INTEGER DEFAULT 0,
      answered_questions INTEGER DEFAULT 0,
      report_id VARCHAR(255),
      scope JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);

  // Add scope column if it was created before
  try {
    await query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS scope JSONB DEFAULT '{}'`);
    await query(`ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_status_check`);
    await query(`ALTER TABLE assessments ADD CONSTRAINT assessments_status_check CHECK (status IN ('setup', 'initialized', 'in_progress', 'submitted', 'analyzing', 'complete', 'failed'))`);
  } catch (e) {
    // Ignore if already exists and syntax is not supported in some PG versions
  }

  // Add assessment_type to assessments
  try {
    await query(`ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50) DEFAULT 'compliance_assessment'`);
    await query(`ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_assessment_type_check`);
    await query(`ALTER TABLE assessments ADD CONSTRAINT assessments_assessment_type_check CHECK (assessment_type IN ('risk_assessment', 'gap_assessment', 'vendor_assessment', 'internal_audit', 'compliance_assessment', 'agent_assessment'))`);
  } catch (e) {
    // Ignore
  }

  // Extend responses table for dual-write compatibility
  try {
    await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS maturity_score INTEGER CHECK (maturity_score >= 0 AND maturity_score <= 5)`);
    await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS is_na BOOLEAN DEFAULT false`);
    await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS audit_answer VARCHAR(50)`);
    await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS domain VARCHAR(100)`);
    try {
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT NULL`);
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255) DEFAULT NULL`);
      await query(`CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id)`);
    } catch (e) {}
    await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS control VARCHAR(100)`);
    await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS critical BOOLEAN DEFAULT false`);
    await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS auto_answered BOOLEAN DEFAULT false`);
    try {
      await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS respondent_id UUID REFERENCES users(id)`);
      await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'draft' CHECK (review_status IN ('draft', 'submitted', 'approved', 'rejected'))`);
      await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id)`);
      await query(`ALTER TABLE responses ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`);
    } catch (e) {}
  } catch (e) {
    // Ignore
  }


  // --- FULL ASSESSMENT MODULE TABLES ---

  // Frameworks table (e.g., ISO 27001, GDPR)
  await query(`
    CREATE TABLE IF NOT EXISTS frameworks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) UNIQUE NOT NULL,
      version VARCHAR(50),
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Assessment Selected Frameworks (Join table for Assessment -> Frameworks)
  await query(`
    CREATE TABLE IF NOT EXISTS assessment_frameworks (
      assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      framework_id UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (assessment_id, framework_id)
    )
  `);

  // Responses table
  await query(`
    CREATE TABLE IF NOT EXISTS responses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      question_id VARCHAR(255) NOT NULL,
      answer_index INTEGER,
      answer_text TEXT,
      maturity_score INTEGER CHECK (maturity_score >= 0 AND maturity_score <= 5),
      category VARCHAR(100),
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(assessment_id, question_id)
    )
  `);

  // Evidence files table
  await query(`
    CREATE TABLE IF NOT EXISTS evidence_files (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
      assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      question_id VARCHAR(255) NOT NULL,
      original_name VARCHAR(500) NOT NULL,
      stored_name VARCHAR(500) NOT NULL,
      file_path TEXT NOT NULL,
      file_size BIGINT,
      mime_type VARCHAR(100),
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Risk priorities table
  await query(`
    CREATE TABLE IF NOT EXISTS risk_priorities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      risk_id VARCHAR(100) NOT NULL,
      priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
      set_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(assessment_id, risk_id)
    )
  `);

  // Create indexes for performance
  await query(`CREATE INDEX IF NOT EXISTS idx_assessments_org_id ON assessments(org_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_responses_assessment_id ON responses(assessment_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_evidence_assessment_id ON evidence_files(assessment_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_org_user_id ON organizations(user_id)`);

  // --- FULL ASSESSMENT MODULE TABLES ---

  // Controls table (linked to frameworks)
  await query(`
    CREATE TABLE IF NOT EXISTS controls (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      framework_id UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
      control_id VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      domain VARCHAR(100),
      priority VARCHAR(50) DEFAULT 'medium',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(framework_id, control_id)
    )
  `);

  // Questions table (linked to controls and frameworks)
  await query(`
    CREATE TABLE IF NOT EXISTS questions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      framework_id UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
      control_id UUID REFERENCES controls(id) ON DELETE SET NULL,
      question_id VARCHAR(100) NOT NULL,
      text TEXT NOT NULL,
      hint TEXT,
      options JSONB DEFAULT '["Yes", "Partial", "No", "N/A"]',
      response_type VARCHAR(50) DEFAULT 'boolean' CHECK (response_type IN ('boolean', 'maturity', 'file', 'text')),
      weight DECIMAL(5,2) DEFAULT 1.0,
      depth_levels TEXT[] DEFAULT '{"quick", "intermediate", "deep"}',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(framework_id, question_id)
    )
  `);

  // Risks table (linked to assessments and optionally controls)
  await query(`
    CREATE TABLE IF NOT EXISTS risks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      control_id UUID REFERENCES controls(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      likelihood INTEGER DEFAULT 1,
      impact INTEGER DEFAULT 1,
      severity VARCHAR(50) DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      mitigation_plan TEXT,
      residual_risk VARCHAR(50),
      status VARCHAR(50) DEFAULT 'identified' CHECK (status IN ('identified', 'mitigated', 'accepted', 'transferred')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(assessment_id, control_id)
    )
  `);

  // --- MAPPING AND INSURANCE TABLES (SCAFFOLDING) ---

  // Control Mappings table
  await query(`
    CREATE TABLE IF NOT EXISTS control_mappings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      source_control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
      target_control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
      mapping_type VARCHAR(50) DEFAULT 'similar',
      strength DECIMAL(3,2) DEFAULT 1.0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(source_control_id, target_control_id)
    )
  `);

  // Insurance Policies/Requirements table
  await query(`
    CREATE TABLE IF NOT EXISTS insurance_requirements (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      policy_name VARCHAR(255) NOT NULL,
      requirement_text TEXT NOT NULL,
      related_control_id UUID REFERENCES controls(id),
      is_mandatory BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);






  // --- COLLABORATION TABLES ---

  // Organization members
  await query(`CREATE TABLE IF NOT EXISTS org_members (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'team_member'
          CHECK (role IN ('owner', 'admin', 'org_admin', 'team_lead', 'team_member')),
      status VARCHAR(50) NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'invited', 'suspended')),
      invited_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(org_id, user_id)
    )`);

  // Update existing org_members role check constraint if needed
  try {
    await query(`ALTER TABLE org_members DROP CONSTRAINT IF EXISTS org_members_role_check`);
    await query(`ALTER TABLE org_members ADD CONSTRAINT org_members_role_check CHECK (role IN ('owner', 'admin', 'org_admin', 'team_lead', 'team_member'))`);
  } catch (e) {
    logger.warn('Failed to update org_members_role_check constraint:', e.message);
  }

  await query(`CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id)`);

  // Invitations
  await query(`CREATE TABLE IF NOT EXISTS invitations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'member',
      invited_by UUID NOT NULL REFERENCES users(id),
      token VARCHAR(255) UNIQUE NOT NULL,
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
      expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

  await query(`CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(org_id)`);

  // Assessment section assignments
  await query(`CREATE TABLE IF NOT EXISTS assessment_assignments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      framework_id UUID REFERENCES frameworks(id) ON DELETE SET NULL,
      assigned_by UUID NOT NULL REFERENCES users(id),
      status VARCHAR(50) DEFAULT 'pending'
          CHECK (status IN ('pending', 'in_progress', 'completed', 'reviewed')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

  await query(`CREATE INDEX IF NOT EXISTS idx_assignments_assessment ON assessment_assignments(assessment_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_assignments_user ON assessment_assignments(user_id)`);

  // Approval workflow
  await query(`CREATE TABLE IF NOT EXISTS approval_workflow (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      reviewer_id UUID NOT NULL REFERENCES users(id),
      status VARCHAR(50) DEFAULT 'pending_review'
          CHECK (status IN ('pending_review', 'approved', 'changes_requested')),
      feedback TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(assessment_id, reviewer_id)
    )`);

  await query(`CREATE INDEX IF NOT EXISTS idx_approval_assessment ON approval_workflow(assessment_id)`);
  // --- COMPLIANCE CALENDAR EVENTS TABLE ---
  await query(`CREATE TABLE IF NOT EXISTS compliance_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('audit_date', 'certification_expiry', 'policy_review', 'regulatory_filing', 'custom')),
      description TEXT,
      event_date DATE NOT NULL,
      reminder_days INTEGER DEFAULT 30,
      is_reminded BOOLEAN DEFAULT false,
      framework VARCHAR(100),
      status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'overdue')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

  await query(`CREATE INDEX IF NOT EXISTS idx_events_user_id ON compliance_events(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_events_date ON compliance_events(event_date)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_events_type ON compliance_events(event_type)`);
  // --- AUDIT LOG TABLE ---
  await query(`CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      resource_type VARCHAR(50) NOT NULL,
      resource_id VARCHAR(255),
      details JSONB DEFAULT '{}',
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

  // Audit log query indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)`);
  // --- REASSESSMENT SCHEDULES TABLE ---
  await query(`CREATE TABLE IF NOT EXISTS reassessment_schedules (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      interval_days INTEGER NOT NULL DEFAULT 90 CHECK (interval_days IN (30, 60, 90, 180, 365)),
      next_due TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days',
      enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(assessment_id)
    )`);

  await query(`CREATE INDEX IF NOT EXISTS idx_schedules_next_due ON reassessment_schedules(next_due)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON reassessment_schedules(user_id)`);

  // --- COMPLIANCE SNAPSHOTS TABLE ---
  await query(`CREATE TABLE IF NOT EXISTS compliance_snapshots (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      framework VARCHAR(100) NOT NULL,
      compliance_score DECIMAL(5,2),
      risk_level VARCHAR(50),
      answered_questions INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      snapshot_type VARCHAR(50) DEFAULT 'auto' CHECK (snapshot_type IN ('auto', 'manual', 'initial')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

  await query(`CREATE INDEX IF NOT EXISTS idx_snapshots_assessment_id ON compliance_snapshots(assessment_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON compliance_snapshots(created_at DESC)`);

  // --- NOTIFICATIONS TABLE ---
  await query(`CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      notification_type VARCHAR(50) DEFAULT 'info' CHECK (notification_type IN ('info', 'warning', 'reminder', 'success')),
      link VARCHAR(255),
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

  await query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false`);


  // Create indexes for new tables
  await query(`CREATE INDEX IF NOT EXISTS idx_controls_framework_id ON controls(framework_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_questions_control_id ON questions(control_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_questions_framework_id ON questions(framework_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_risks_assessment_id ON risks(assessment_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_risks_control_id ON risks(control_id)`);

  // --- POLICIES TABLE FOR POLICY GOVERNANCE HUB ---
  await query(`CREATE TABLE IF NOT EXISTS policies (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      policy_name VARCHAR(255) NOT NULL,
      policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN ('compulsory', 'optional')),
      file_url VARCHAR(500) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed', 'gaps_found', 'compliant', 'PENDING_LEAD_SIGN_OFF', 'APPROVED_PRODUCTION')),
      compliance_score DECIMAL(5,2),
      ai_analysis_report JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

  await query(`CREATE INDEX IF NOT EXISTS idx_policies_org_id ON policies(org_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status)`);

  // --- END FULL ASSESSMENT MODULE TABLES ---

  // Migration: Ensure all assessment org members are in org_members table
  // This fixes the issue where users who created organizations weren't added to org_members
  try {
    logger.info('Running migration: Adding assessment creators to org_members...');
    await query(`
      INSERT INTO org_members (org_id, user_id, role, status, invited_by)
      SELECT DISTINCT a.org_id, a.user_id, 'org_admin', 'active', a.user_id
      FROM assessments a
      WHERE NOT EXISTS (
        SELECT 1 FROM org_members om 
        WHERE om.org_id = a.org_id AND om.user_id = a.user_id
      )
      ON CONFLICT DO NOTHING
    `);
    const result = await query(`
      SELECT COUNT(*) as count FROM org_members om
      WHERE om.role = 'org_admin' AND om.status = 'active'
    `);
    logger.info(`Migration completed: ${result.rows[0]?.count || 0} org_admin members are active`);
  } catch (e) {
    logger.warn('Migration: Failed to add assessment creators to org_members:', e.message);
  }

  // Migration: Update policies table status check constraint to support new statuses
  try {
    logger.info('Running migration: Updating policies status constraint...');
    await query('ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_status_check');
    await query(`ALTER TABLE policies ADD CONSTRAINT policies_status_check CHECK (status IN ('pending', 'analyzed', 'gaps_found', 'compliant', 'PENDING_LEAD_SIGN_OFF', 'APPROVED_PRODUCTION'))`);
  } catch (e) {
    logger.warn('Migration: Failed to update policies status constraint:', e.message);
  }

  logger.info('Database migrations completed successfully');
  await seedFrameworks();
  await seedQuestionsAndControls();
  await seedControlMappings();
  await seedInsuranceRequirements();
}

// ... existing seedControlMappings ...

async function seedInsuranceRequirements() {
  logger.info('Seeding cyber insurance requirements...');
  
  const requirements = [
    { name: 'Multi-Factor Authentication (MFA)', text: 'MFA must be enabled for all remote access and privileged accounts.', mandatory: true, search: '%Authentication%' },
    { name: 'Regular Backups', text: 'Offsite, encrypted backups must be performed at least weekly.', mandatory: true, search: '%Backup%' },
    { name: 'Endpoint Protection', text: 'EDR or advanced anti-malware must be deployed on all endpoints.', mandatory: true, search: '%Endpoint%' },
    { name: 'Incident Response Plan', text: 'A documented and tested incident response plan must be in place.', mandatory: true, search: '%Incident%' },
    { name: 'Security Awareness Training', text: 'All employees must receive security training at least annually.', mandatory: false, search: '%Training%' },
    { name: 'Encryption of Sensitive Data', text: 'Personal and sensitive data must be encrypted at rest and in transit.', mandatory: true, search: '%Encryption%' }
  ];

  for (const req of requirements) {
    // Try to find a matching control from ANY framework to link to
    const controlResult = await query(
      "SELECT id FROM controls WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 1",
      [req.search]
    );
    
    const controlId = controlResult.rows.length > 0 ? controlResult.rows[0].id : null;

    await query(
      `INSERT INTO insurance_requirements (policy_name, requirement_text, related_control_id, is_mandatory)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [req.name, req.text, controlId, req.mandatory]
    );
  }
  logger.info('Insurance requirements seeding completed.');
}

// ... existing seedFrameworks ...

async function seedControlMappings() {
  logger.info('Seeding smart control mappings...');
  
  // Example: Map GDPR 'Lawful Basis' to DPDPA 'Data Minimization/Consent'
  // This is a simplified example of cross-framework mapping
  const gdprControls = await query(
    "SELECT id FROM controls WHERE framework_id IN (SELECT id FROM frameworks WHERE name = 'GDPR') AND domain = 'Lawful Basis'"
  );
  const dpdpaControls = await query(
    "SELECT id FROM controls WHERE framework_id IN (SELECT id FROM frameworks WHERE name = 'DPDP Act') AND domain = 'Data Minimization'"
  );

  if (gdprControls.rows.length > 0 && dpdpaControls.rows.length > 0) {
    for (const gCtrl of gdprControls.rows) {
      for (const dCtrl of dpdpaControls.rows) {
        await query(
          `INSERT INTO control_mappings (source_control_id, target_control_id, mapping_type, strength)
           VALUES ($1, $2, 'equivalent', 1.0)
           ON CONFLICT DO NOTHING`,
          [gCtrl.id, dCtrl.id]
        );
      }
    }
  }
  logger.info('Smart mapping seeding completed.');
}

async function seedFrameworks() {
  const frameworks = [
    'ISO/IEC 27001:2022', 'SOC 2 Trust Services Criteria',
    'GDPR', 'NIST CSF 2.0', 'PCI DSS v4.0', 'HIPAA Security Rule',
    'DPDPA (India)', 'CCPA/CPRA', 'CIS Controls v8',
    'DPDP Act', 'CCPA', 'HIPAA',
    'ISO/IEC 27001', 'ISO/IEC 27002', 'ISO/IEC 27701',
    'PCI DSS', 'SOC 2', 'FedRAMP',
    'NIST CSF', 'CIS Controls', 'COBIT',
    'ISO/IEC 27017', 'ISO/IEC 27018', 'CSA CCM',
    'ISO 31000', 'NIST RMF'
  ];

  logger.info('Seeding default frameworks...');
  for (const name of frameworks) {
    await query(
      'INSERT INTO frameworks (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [name]
    );
  }
}

async function seedQuestionsAndControls() {
  const QUESTION_BANK = require('../data/questionBank');
  logger.info('Seeding questions and controls from bank...');

  const frameworksResult = await query('SELECT id, name FROM frameworks');
  const fwMap = {};
  frameworksResult.rows.forEach(r => { fwMap[r.name] = r.id; });

  // Map of bank names to UI names (aliases) to ensure seeding happens for both
  const ALIAS_MAP = {
    'DPDP Act': ['DPDPA (India)', 'DPDP Act'],
    'ISO/IEC 27001': ['ISO/IEC 27001', 'ISO/IEC 27001:2022'],
    'SOC 2': ['SOC 2', 'SOC 2 Trust Services Criteria'],
    'NIST CSF': ['NIST CSF', 'NIST CSF 2.0'],
    'PCI DSS': ['PCI DSS', 'PCI DSS v4.0'],
    'HIPAA': ['HIPAA', 'HIPAA Security Rule'],
    'CCPA': ['CCPA', 'CCPA/CPRA'],
    'CIS Controls': ['CIS Controls', 'CIS Controls v8']
  };

  for (const [bankFwName, categories] of Object.entries(QUESTION_BANK)) {
    const targetFwNames = ALIAS_MAP[bankFwName] || [bankFwName];
    
    for (const fwName of targetFwNames) {
      const fwId = fwMap[fwName];
      if (!fwId) {
        logger.debug(`Skipping seeding for framework: ${fwName} (not found in DB)`);
        continue;
      }

      logger.info(`Seeding ${bankFwName} content into ${fwName} (${fwId})`);

      for (const [catName, questions] of Object.entries(categories)) {
        for (const q of questions) {
          // 1. Create/Find Control (using the first control_id as reference)
          const primaryControlId = q.controls && q.controls.length > 0 ? q.controls[0] : `CTRL-${catName.toUpperCase()}`;
          
          const controlResult = await query(
            `INSERT INTO controls (framework_id, control_id, name, domain)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (framework_id, control_id) DO UPDATE SET domain = EXCLUDED.domain
             RETURNING id`,
            [fwId, primaryControlId, primaryControlId, catName]
          );
          const controlDbId = controlResult.rows[0].id;

          // 2. Determine response type
          let responseType = 'boolean';
          if (q.text.toLowerCase().includes('maturity') || q.text.toLowerCase().includes('scale')) {
            responseType = 'maturity';
          } else if (q.text.toLowerCase().includes('upload') || q.text.toLowerCase().includes('evidence')) {
            responseType = 'file';
          }

          // 3. Insert Question
          await query(
            `INSERT INTO questions (framework_id, control_id, question_id, text, hint, options, response_type, weight, depth_levels)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (framework_id, question_id) 
             DO UPDATE SET 
                text = EXCLUDED.text,
                hint = EXCLUDED.hint,
                options = EXCLUDED.options,
                response_type = EXCLUDED.response_type,
                weight = EXCLUDED.weight,
                depth_levels = EXCLUDED.depth_levels,
                updated_at = NOW()`,
            [
              fwId, 
              controlDbId, 
              q.id, 
              q.text, 
              q.hint, 
              JSON.stringify(q.opts), 
              responseType, 
              q.weight || 1.0, 
              q.depth || ['quick', 'intermediate', 'deep']
            ]
          );
        }
      }
    }
  }
  logger.info('Question seeding completed.');
}

async function verifyAssessmentOwnership(assessmentId, orgId) {
  if (!assessmentId) return false;
  const check = await query('SELECT org_id FROM assessments WHERE id = $1', [assessmentId]);
  if (check.rows.length === 0) return false;
  if (check.rows[0].org_id !== orgId) {
    const err = new Error('Access Denied: Security Violation');
    err.statusCode = 403;
    throw err;
  }
  return true;
}

async function verifyReportOwnership(reportId, orgId) {
  if (!reportId) return false;
  const check = await query('SELECT org_id FROM assessments WHERE report_id = $1', [reportId]);
  if (check.rows.length === 0) return false;
  if (check.rows[0].org_id !== orgId) {
    const err = new Error('Access Denied: Security Violation');
    err.statusCode = 403;
    throw err;
  }
  return true;
}

async function verifyPolicyOwnership(policyId, orgId) {
  if (!policyId) return false;
  const check = await query('SELECT org_id FROM policies WHERE id = $1', [policyId]);
  if (check.rows.length === 0) return false;
  if (check.rows[0].org_id !== orgId) {
    const err = new Error('Access Denied: Security Violation');
    err.statusCode = 403;
    throw err;
  }
  return true;
}

module.exports = { pool, query, connectPostgres, runMigrations, verifyAssessmentOwnership, verifyReportOwnership, verifyPolicyOwnership };
