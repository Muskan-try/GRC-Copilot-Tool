const { query, verifyAssessmentOwnership } = require('../../../config/postgres');
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
    
    // First, check if the user is already an active member of the organization
    const memberCheck = await query(
      `SELECT o.id FROM organizations o
       JOIN org_members om ON o.id = om.org_id
       WHERE o.name = $1 AND om.user_id = $2 AND om.status = 'active'
       LIMIT 1`,
      [organizationName, userId]
    );

    if (memberCheck.rows.length > 0) {
      orgId = memberCheck.rows[0].id;
    } else {
      // If not a member, try to create the organization
      try {
        const newOrg = await query(
          'INSERT INTO organizations (name, user_id, region, employee_range) VALUES ($1, $2, $3, $4) RETURNING id',
          [organizationName, userId, scope.region || null, scope.employee_range || null]
        );
        orgId = newOrg.rows[0].id;
      } catch (err) {
        // Handle unique constraint on organization name
        if (err.code === '23505') {
          // Find the existing org to return a better error, or add them if they should be added
          // Typically if name exists, they must be invited.
          throw new Error('Organization name already exists and you are not a member.');
        }
        throw err;
      }
      
      // Add user as org_admin to org_members if organization is newly created
      try {
        await query(
          `INSERT INTO org_members (org_id, user_id, role, status, invited_by)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [orgId, userId, 'org_admin', 'active', userId]
        );
        logger.info(`Added user ${userId} as org_admin to organization ${orgId}`);
      } catch (e) {
        logger.warn(`Failed to add user to org_members: ${e.message}`);
      }
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
   * @param {string} orgId 
   */
  async completeAssessment(assessmentId, orgId) {
    logger.info(`Marking assessment ${assessmentId} as complete.`);
    await verifyAssessmentOwnership(assessmentId, orgId);
    const result = await query(
      `UPDATE assessments 
       SET status = 'complete', 
           completed_at = NOW(), 
           updated_at = NOW() 
       WHERE id = $1 AND org_id = $2 AND status != 'complete'
       RETURNING *`,
      [assessmentId, orgId]
    );
    return result.rows[0];
  }

  /**
   * Get full assessment metadata.
   * @param {string} assessmentId - UUID of the assessment.
   * @param {string} orgId - UUID of the organization.
   */
  async getAssessment(assessmentId, orgId) {
    await verifyAssessmentOwnership(assessmentId, orgId);
    const result = await query(
      `SELECT a.*, o.name as organization_name
       FROM assessments a
       JOIN organizations o ON a.org_id = o.id
       WHERE a.id = $1 AND a.org_id = $2`,
      [assessmentId, orgId]
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
   * Update assessment configuration (type, depth, status).
   * @param {string} assessmentId 
   * @param {string} orgId 
   * @param {object} updates - { analysis_depth, assessment_type, status }
   */
  async updateAssessmentConfig(assessmentId, orgId, updates) {
    await verifyAssessmentOwnership(assessmentId, orgId);
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
    values.push(orgId);
    const assessIdIdx = idx++;
    const orgIdIdx = idx++;

    const result = await query(
      `UPDATE assessments SET ${fields.join(', ')} WHERE id = $${assessIdIdx} AND org_id = $${orgIdIdx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Assessment not found or unauthorized');
    }

    return result.rows[0];
  }

  async getAssessmentProgress(assessmentId, orgId) {
    await verifyAssessmentOwnership(assessmentId, orgId);
    const result = await query(
      'SELECT total_questions, answered_questions, status FROM assessments WHERE id = $1 AND org_id = $2',
      [assessmentId, orgId]
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
   * @param {string} orgId - UUID of the organization.
   * @param {string[]} frameworkNames - List of framework names to add.
   */
  async addFrameworks(assessmentId, orgId, frameworkNames) {
    logger.info(`Adding frameworks to assessment ${assessmentId}: ${frameworkNames.join(', ')}`);

    // 1. Verify ownership/authorization
    await verifyAssessmentOwnership(assessmentId, orgId);

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

  /**
   * Delete an assessment.
   * @param {string} assessmentId 
   * @param {string} orgId 
   */
  async deleteAssessment(assessmentId, orgId) {
    logger.info(`Deleting assessment ${assessmentId} by user in org ${orgId}`);
    await verifyAssessmentOwnership(assessmentId, orgId);
    const result = await query(
      `DELETE FROM assessments 
       WHERE id = $1 AND org_id = $2
       RETURNING *`,
      [assessmentId, orgId]
    );
    return result.rows[0];
  }
}

module.exports = new AssessmentService();
