const { query } = require('../../../config/postgres');
const logger = require('../../../config/logger');
const { EvidenceFile, AssessmentResponse } = require('../../../config/mongo');

/**
 * Evidence Service v2
 * Triple-write: Disk + PostgreSQL + MongoDB
 */
class EvidenceService {
  /**
   * Store evidence file metadata.
   * @param {string} assessmentId
   * @param {string} userId
   * @param {object} file - Multer file object
   * @param {string} questionId - Optional
   */
  async addEvidence(assessmentId, userId, file, questionId = null) {
    logger.info(`Adding evidence for assessment ${assessmentId}, file: ${file.originalname}`);

    // 1. Verify assessment ownership
    const assessResult = await query(
      'SELECT a.id FROM assessments a JOIN org_members om ON om.org_id = a.org_id WHERE a.id = $1 AND om.user_id = $2 AND om.status = \'active\'',
      [assessmentId, userId]
    );
    if (assessResult.rows.length === 0) {
      throw new Error('Assessment not found or unauthorized');
    }

    // 2. Find associated response if questionId is provided (PostgreSQL)
    let responseId = null;
    if (questionId) {
      const responseResult = await query(
        'SELECT id FROM responses WHERE assessment_id = $1 AND question_id = $2',
        [assessmentId, questionId]
      );
      responseId = responseResult.rows[0]?.id || null;
    }

    // 3. Store in PostgreSQL (BACKWARD COMPATIBILITY)
    const pgResult = await query(
      `INSERT INTO evidence_files
       (assessment_id, response_id, question_id, original_name, stored_name, file_path, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, original_name, uploaded_at`,
      [
        assessmentId,
        responseId,
        questionId,
        file.originalname,
        file.filename,
        file.path,
        file.size,
        file.mimetype
      ]
    );

    // 4. Store in MongoDB (PRIMARY)
    const mongoEvidence = await EvidenceFile.create({
      assessment_id: assessmentId,
      response_id: responseId ? responseId.toString() : null,
      question_id: questionId,
      user_id: userId,
      original_name: file.originalname,
      stored_name: file.filename,
      file_path: file.path,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_at: new Date(),
    });

    // 5. Update evidence_count on MongoDB AssessmentResponse
    if (questionId) {
      await AssessmentResponse.findOneAndUpdate(
        { assessment_id: assessmentId, question_id: questionId },
        { $inc: { evidence_count: 1 } }
      );
    }

    logger.info(`Evidence stored: PG id=${pgResult.rows[0].id}, Mongo id=${mongoEvidence._id}`);

    return {
      ...pgResult.rows[0],
      mongo_id: mongoEvidence._id.toString(),
    };
  }

  /**
   * Get all evidence for an assessment (MongoDB primary, PG fallback).
   */
  async getEvidenceForAssessment(assessmentId, userId) {
    // Try MongoDB first
    const mongoEvidence = await EvidenceFile.find({
      assessment_id: assessmentId,
      user_id: userId,
    }).sort({ uploaded_at: -1 }).lean();

    if (mongoEvidence && mongoEvidence.length > 0) {
      return mongoEvidence.map(e => ({
        id: e._id.toString(),
        original_name: e.original_name,
        question_id: e.question_id,
        file_size: e.file_size,
        mime_type: e.mime_type,
        uploaded_at: e.uploaded_at,
        file_path: e.file_path,
      }));
    }

    // Fallback to PostgreSQL
    const result = await query(
      `SELECT ef.id, ef.original_name, ef.question_id, ef.file_size, ef.mime_type, ef.uploaded_at, ef.file_path
       FROM evidence_files ef
       JOIN assessments a ON ef.assessment_id = a.id
       WHERE a.id = $1 AND a.org_id IN (SELECT org_id FROM org_members WHERE user_id = $2 AND status = 'active')`,
      [assessmentId, userId]
    );
    return result.rows;
  }

  /**
   * Get evidence stats for dashboard.
   */
  async getEvidenceStats(assessmentId) {
    const total = await EvidenceFile.countDocuments({ assessment_id: assessmentId });
    const byQuestion = await EvidenceFile.aggregate([
      { $match: { assessment_id: assessmentId } },
      { $group: { _id: '$question_id', count: { $sum: 1 } } },
    ]);

    return {
      total_files: total,
      files_by_question: byQuestion,
    };
  }
}

module.exports = new EvidenceService();
