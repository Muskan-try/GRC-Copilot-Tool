const { query } = require('../../../config/postgres');
const logger = require('../../../config/logger');

/**
 * Assessment Service
 * Handles core assessment lifecycle and orchestration.
 */
class AssessmentService {
  /**
   * Initialize a new assessment.
   * @param {string} organizationName - Name of the organization.
   * @param {string} userId - ID of the user creating the assessment.
   * @param {string[]} frameworkNames - List of framework names to link.
   * @param {object} scope - Scope definition (departments, assets, etc.).
   * @param {string} analysisDepth - Type of assessment (full, quick, gap, etc.).
   */
  async createAssessment(organizationName, userId, frameworkNames, scope, analysisDepth = 'quick', assessmentType = 'compliance_assessment') {
    logger.info(`Initializing ${analysisDepth} ${assessmentType} assessment for organization: ${organizationName}`);

    // 1. Find or create organization for this user
    let orgId;
    const orgResult = await query(
      'SELECT id FROM organizations WHERE name = $1 AND user_id = $2',
      [organizationName, userId]
    );

    if (orgResult.rows.length > 0) {
      orgId = orgResult.rows[0].id;
    } else {
      const newOrg = await query(
        'INSERT INTO organizations (name, user_id, region, employee_range) VALUES ($1, $2, $3, $4) RETURNING id',
        [organizationName, userId, scope.region || null, scope.employee_range || null]
      );
      orgId = newOrg.rows[0].id;
    }

    // 2. Resolve framework IDs from names
    const frameworkIds = await this.getFrameworkIdsByNames(frameworkNames);
    if (frameworkIds.length === 0) {
      throw new Error('None of the selected frameworks were found in the system.');
    }

    // 3. Create assessment record
    const primaryFramework = frameworkNames[0];
    const assessmentResult = await query(
      `INSERT INTO assessments (org_id, user_id, framework, analysis_depth, assessment_type, status, scope)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [orgId, userId, primaryFramework, analysisDepth, assessmentType, 'initialized', JSON.stringify(scope)]
    );

    const assessment = assessmentResult.rows[0];

    // 4. Link multiple frameworks
    for (const fwId of frameworkIds) {
      await query(
        'INSERT INTO assessment_frameworks (assessment_id, framework_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [assessment.id, fwId]
      );
    }

    return {
      ...assessment,
      linked_frameworks: frameworkNames
    };
  }

  /**
   * Mark an assessment as complete and set the completion date.
   * @param {string} assessmentId 
   * @param {string} userId 
   */
  async completeAssessment(assessmentId, userId) {
    logger.info(`Marking assessment ${assessmentId} as complete.`);
    const result = await query(
      `UPDATE assessments 
       SET status = 'complete', 
           completed_at = NOW(), 
           updated_at = NOW() 
       WHERE id = $1 AND user_id = $2 AND status != 'complete'
       RETURNING *`,
      [assessmentId, userId]
    );
    return result.rows[0];
  }

  /**
   * Get full assessment metadata.
   * @param {string} assessmentId - UUID of the assessment.
   * @param {string} userId - UUID of the user.
   */
  async getAssessment(assessmentId, userId) {
    const result = await query(
      `SELECT a.*, o.name as organization_name
       FROM assessments a
       JOIN organizations o ON a.org_id = o.id
       WHERE a.id = $1 AND a.org_id IN (SELECT org_id FROM org_members WHERE user_id = $2 AND status = 'active')`,
      [assessmentId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const assessment = result.rows[0];

    // Fetch linked frameworks
    const fwResult = await query(
      `SELECT f.name, f.id
       FROM assessment_frameworks af
       JOIN frameworks f ON af.framework_id = f.id
       WHERE af.assessment_id = $1`,
      [assessmentId]
    );

    assessment.frameworks = fwResult.rows;
    return assessment;
  }

  /**
   * Internal helper to resolve framework names to IDs.
   */
  async getFrameworkIdsByNames(names) {
    if (!names || !names.length) return [];
    
    const result = await query(
      'SELECT id, name FROM frameworks WHERE name = ANY($1)',
      [names]
    );
    
    return result.rows.map(r => r.id);
  }

  /**
   * Update assessment configuration (type, depth, status).
   * @param {string} assessmentId 
   * @param {string} userId 
   * @param {object} updates - { analysis_depth, assessment_type, status }
   */
  async updateAssessmentConfig(assessmentId, userId, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (updates.analysis_depth !== undefined) {
      fields.push(`analysis_depth = $${idx++}`);
      values.push(updates.analysis_depth);
    }
    if (updates.assessment_type !== undefined) {
      fields.push(`assessment_type = $${idx++}`);
      values.push(updates.assessment_type);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
    }
    if (updates.framework !== undefined) {
      fields.push(`framework = $${idx++}`);
      values.push(updates.framework);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(assessmentId);
    values.push(userId);

    const result = await query(
      `UPDATE assessments SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx++} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Assessment not found or unauthorized');
    }

    return result.rows[0];
  }

  async getAssessmentProgress(assessmentId) {
    const result = await query(
      'SELECT total_questions, answered_questions, status FROM assessments WHERE id = $1',
      [assessmentId]
    );
    if (result.rows.length === 0) return null;
    
    const { total_questions, answered_questions, status } = result.rows[0];
    const progress = total_questions > 0 ? (answered_questions / total_questions) * 100 : 0;
    
    return {
      assessmentId,
      progress,
      status
    };
    }

    /**
    * Link additional frameworks to an existing assessment.
    * @param {string} assessmentId - UUID of the assessment.
    * @param {string} userId - UUID of the user.
    * @param {string[]} frameworkNames - List of framework names to add.
    */
    async addFrameworks(assessmentId, userId, frameworkNames) {
    logger.info(`Adding frameworks to assessment ${assessmentId}: ${frameworkNames.join(', ')}`);

    // 1. Verify ownership
    const assessResult = await query(
      'SELECT id FROM assessments WHERE id = $1 AND user_id = $2',
      [assessmentId, userId]
    );
    if (assessResult.rows.length === 0) throw new Error('Assessment not found or unauthorized');

    // 2. Resolve framework IDs
    const frameworkIds = await this.getFrameworkIdsByNames(frameworkNames);
    if (frameworkIds.length === 0) return { success: false, added: 0 };

    // 3. Link them
    let addedCount = 0;
    for (const fwId of frameworkIds) {
      const linkResult = await query(
        'INSERT INTO assessment_frameworks (assessment_id, framework_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [assessmentId, fwId]
      );
      if (linkResult.rowCount > 0) addedCount++;
    }

    return {
      success: true,
      added_count: addedCount
    };
    }
    }

module.exports = new AssessmentService();
