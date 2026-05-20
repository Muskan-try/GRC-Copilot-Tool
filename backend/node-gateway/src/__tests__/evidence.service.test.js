jest.mock('../config/postgres', () => ({
  query: jest.fn(),
}));

jest.mock('../config/mongo', () => ({
  EvidenceFile: {
    create: jest.fn().mockResolvedValue({ _id: 'mongo-ev-1' }),
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(3),
    aggregate: jest.fn().mockResolvedValue([{ _id: 'q1', count: 2 }]),
  },
  AssessmentResponse: {
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { query } = require('../config/postgres');
const { EvidenceFile, AssessmentResponse } = require('../config/mongo');
const evidenceService = require('../modules/assessment/services/evidence.service');

describe('evidence.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addEvidence', () => {
    it('throws if assessment not found or unauthorized', async () => {
      query.mockResolvedValue({ rows: [] });
      const file = { originalname: 'test.pdf', filename: 'stored.pdf', path: '/tmp/stored.pdf', size: 1024, mimetype: 'application/pdf' };

      await expect(evidenceService.addEvidence('a1', 'u1', file, 'q1')).rejects.toThrow('Assessment not found or unauthorized');
    });

    it('performs triple-write: disk (implicit), PG, MongoDB', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 'a1' }] }) // assessment ownership
        .mockResolvedValueOnce({ rows: [{ id: 'resp-1' }] }) // find response
        .mockResolvedValueOnce({ rows: [{ id: 'pg-ev-1', original_name: 'test.pdf', uploaded_at: new Date() }] }); // insert evidence

      const file = { originalname: 'test.pdf', filename: 'stored.pdf', path: '/tmp/stored.pdf', size: 1024, mimetype: 'application/pdf' };

      const result = await evidenceService.addEvidence('a1', 'u1', file, 'q1');

      // PostgreSQL insert
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO evidence_files'),
        expect.arrayContaining(['a1', 'resp-1', 'q1', 'test.pdf', 'stored.pdf', '/tmp/stored.pdf', 1024, 'application/pdf'])
      );

      // MongoDB create
      expect(EvidenceFile.create).toHaveBeenCalledWith(expect.objectContaining({
        assessment_id: 'a1',
        question_id: 'q1',
        original_name: 'test.pdf',
      }));

      // MongoDB evidence count increment
      expect(AssessmentResponse.findOneAndUpdate).toHaveBeenCalledWith(
        { assessment_id: 'a1', question_id: 'q1' },
        { $inc: { evidence_count: 1 } }
      );

      expect(result.mongo_id).toBe('mongo-ev-1');
    });

    it('works without questionId (no response linkage)', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 'a1' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'pg-ev-1', original_name: 'test.pdf', uploaded_at: new Date() }] });

      const file = { originalname: 'test.pdf', filename: 'stored.pdf', path: '/tmp/stored.pdf', size: 1024, mimetype: 'application/pdf' };

      await evidenceService.addEvidence('a1', 'u1', file);

      expect(AssessmentResponse.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getEvidenceForAssessment', () => {
    it('returns MongoDB evidence when available', async () => {
      EvidenceFile.lean.mockResolvedValue([
        { _id: 'ev1', original_name: 'a.pdf', question_id: 'q1', file_size: 100, mime_type: 'application/pdf', uploaded_at: new Date(), file_path: '/tmp/a.pdf' },
      ]);

      const result = await evidenceService.getEvidenceForAssessment('a1', 'u1');

      expect(result).toHaveLength(1);
      expect(result[0].original_name).toBe('a.pdf');
      expect(query).not.toHaveBeenCalledWith(expect.stringContaining('evidence_files ef'), expect.any(Array));
    });

    it('falls back to PostgreSQL when MongoDB is empty', async () => {
      EvidenceFile.lean.mockResolvedValue([]);
      query.mockResolvedValue({
        rows: [
          { id: 'ev-pg', original_name: 'b.pdf', question_id: 'q2', file_size: 200, mime_type: 'application/pdf', uploaded_at: new Date(), file_path: '/tmp/b.pdf' },
        ],
      });

      const result = await evidenceService.getEvidenceForAssessment('a1', 'u1');

      expect(result).toHaveLength(1);
      expect(result[0].original_name).toBe('b.pdf');
    });
  });

  describe('getEvidenceStats', () => {
    it('returns total count and per-question breakdown', async () => {
      const result = await evidenceService.getEvidenceStats('a1');

      expect(result.total_files).toBe(3);
      expect(result.files_by_question).toEqual([{ _id: 'q1', count: 2 }]);
    });
  });
});
