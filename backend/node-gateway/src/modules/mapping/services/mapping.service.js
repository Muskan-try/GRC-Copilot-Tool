const { query } = require('../../../config/postgres');
const logger = require('../../../config/logger');

/**
 * Mapping Service
 * Handles control mapping and smart deduplication between frameworks.
 */
class MappingService {
  /**
   * Get all equivalent control mappings for an assessment.
   * This helps group controls that can share answers.
   */
  async getAssessmentMappings(assessmentId) {
    const result = await query(
      `SELECT cm.source_control_id, cm.target_control_id, cm.strength
       FROM control_mappings cm
       WHERE cm.source_control_id IN (
         SELECT control_id FROM questions q 
         JOIN assessment_frameworks af ON q.framework_id = af.framework_id 
         WHERE af.assessment_id = $1
       )
       AND cm.target_control_id IN (
         SELECT control_id FROM questions q 
         JOIN assessment_frameworks af ON q.framework_id = af.framework_id 
         WHERE af.assessment_id = $1
       )
       AND cm.strength >= 0.9`,
      [assessmentId]
    );

    // Create a bidirectional map of equivalent controls
    const map = new Map();
    result.rows.forEach(row => {
      if (!map.has(row.source_control_id)) map.set(row.source_control_id, new Set());
      if (!map.has(row.target_control_id)) map.set(row.target_control_id, new Set());
      
      map.get(row.source_control_id).add(row.target_control_id);
      map.get(row.target_control_id).add(row.source_control_id);
    });

    return map;
  }

  /**
   * Helper to find the 'canonical' ID for a control in a mapping set.
   */
  getCanonicalId(controlId, mappingMap) {
    if (!mappingMap.has(controlId)) return controlId;
    
    // Pick the lexicographically first ID as canonical for consistency
    const cluster = Array.from(mappingMap.get(controlId));
    cluster.push(controlId);
    cluster.sort();
    return cluster[0];
  }
}

module.exports = new MappingService();
