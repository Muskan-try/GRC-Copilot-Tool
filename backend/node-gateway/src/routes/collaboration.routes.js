const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/postgres');
const { authenticate } = require('../middleware/auth');
const collab = require('../services/collaboration.service');
const audit = require('../services/audit.service');
const router = express.Router();

// Helper: require org membership with minimum role
async function requireOrgRole(req, res, next, minRole = 'member') {
  const orgId = req.body.org_id || req.query.org_id || req.params.orgId;
  if (!orgId) return res.status(400).json({ error: 'org_id required' });
  
  const membership = await collab.getUserOrgRole(req.user.user_id, orgId);
  if (!membership || membership.status !== 'active') {
    return res.status(403).json({ error: 'Not a member of this organization' });
  }
  
  const roleRank = { owner: 5, admin: 4, reviewer: 3, member: 2, auditor: 1 };
  if ((roleRank[membership.role] || 0) < (roleRank[minRole] || 0)) {
    return res.status(403).json({ error: `Requires ${minRole} role or higher` });
  }
  
  req.membership = membership;
  next();
}

// ─── Members ────────────────────────────────────────────────

// GET /api/collab/members?org_id=xxx
router.get('/members', authenticate, async (req, res, next) => {
  try {
    const members = await collab.listOrgMembers(req.query.org_id);
    res.json({ members });
  } catch (err) { next(err); }
});

// DELETE /api/collab/members/:userId?org_id=xxx
router.delete('/members/:userId', authenticate, async (req, res, next) => {
  try {
    await collab.removeOrgMember(req.query.org_id, req.params.userId);
    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
});

// PUT /api/collab/members/:userId/role?org_id=xxx
router.put('/members/:userId/role', authenticate, async (req, res, next) => {
  try {
    const member = await collab.updateMemberRole(req.query.org_id, req.params.userId, req.body.role);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) { next(err); }
});

// ─── Invitations ────────────────────────────────────────────

// POST /api/collab/invite
router.post('/invite', authenticate, [
  body('org_id').isUUID().withMessage('Valid org_id required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('role').optional().isIn(['member', 'admin', 'auditor', 'reviewer']),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const { org_id, email, role = 'member' } = req.body;
    const invite = await collab.createInvitation(org_id, email, role, req.user.user_id);
    
    await audit.log(req.user.user_id, 'collab.invite_create', 'invitation', invite.id,
      { org_id, email, role }, req).catch(() => {});

    // Return the invite link that would be sent via email
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-invite?token=${invite.token}`;
    res.status(201).json({ ...invite, invite_link: inviteLink });
  } catch (err) { next(err); }
});

// POST /api/collab/accept-invite
router.post('/accept-invite', authenticate, [
  body('token').notEmpty().withMessage('Token required'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

    const result = await collab.acceptInvitation(req.body.token, req.user.user_id);
    if (!result) return res.status(400).json({ error: 'Invalid or expired invitation token' });

    await audit.log(req.user.user_id, 'collab.invite_accept', 'invitation', result.invite.id,
      { org_id: result.invite.org_id }, req).catch(() => {});

    res.json({ message: 'Invitation accepted', org_name: result.invite.org_name, org_id: result.invite.org_id });
  } catch (err) { next(err); }
});

// GET /api/collab/invitations?org_id=xxx
router.get('/invitations', authenticate, async (req, res, next) => {
  try {
    const invites = await collab.listPendingInvitations(req.query.org_id);
    res.json({ invitations: invites });
  } catch (err) { next(err); }
});

// DELETE /api/collab/invitations/:id
router.delete('/invitations/:id', authenticate, async (req, res, next) => {
  try {
    await collab.cancelInvitation(req.params.id);
    res.json({ message: 'Invitation cancelled' });
  } catch (err) { next(err); }
});

// ─── Assignments ─────────────────────────────────────────────

// POST /api/collab/assignments
router.post('/assignments', authenticate, [
  body('assessment_id').isUUID(),
  body('user_id').isUUID(),
  body('framework_id').optional({ nullable: true }),
], async (req, res, next) => {
  try {
    const { assessment_id, user_id, framework_id } = req.body;
    const assignment = await collab.assignSection(assessment_id, user_id, framework_id, req.user.user_id);
    audit.log(req.user.user_id, 'collab.assignment_create', 'assignment', assignment.id,
      { assessment_id, user_id }, req).catch(() => {});
    res.status(201).json(assignment);
  } catch (err) { next(err); }
});

// GET /api/collab/assignments/:assessmentId
router.get('/assignments/:assessmentId', authenticate, async (req, res, next) => {
  try {
    const assignments = await collab.getAssignments(req.params.assessmentId);
    res.json({ assignments });
  } catch (err) { next(err); }
});

// PUT /api/collab/assignments/:id/status
router.put('/assignments/:id/status', authenticate, async (req, res, next) => {
  try {
    const assignment = await collab.updateAssignmentStatus(req.params.id, req.body.status);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    res.json(assignment);
  } catch (err) { next(err); }
});

// GET /api/collab/my-assignments
router.get('/my-assignments', authenticate, async (req, res, next) => {
  try {
    const assignments = await collab.getMyAssignments(req.user.user_id);
    res.json({ assignments });
  } catch (err) { next(err); }
});

// ─── Approval Workflow ──────────────────────────────────────

// POST /api/collab/submit-review/:assessmentId
router.post('/submit-review/:assessmentId', authenticate, [
  body('reviewer_id').isUUID().withMessage('reviewer_id required'),
], async (req, res, next) => {
  try {
    const result = await collab.submitForReview(req.params.assessmentId, req.body.reviewer_id);
    audit.log(req.user.user_id, 'collab.submit_review', 'approval_workflow', result.id,
      { assessment_id: req.params.assessmentId }, req).catch(() => {});
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/collab/review/:assessmentId
router.post('/review/:assessmentId', authenticate, [
  body('status').isIn(['approved', 'changes_requested']).withMessage('Status must be approved or changes_requested'),
  body('feedback').optional().isString(),
], async (req, res, next) => {
  try {
    const result = await collab.reviewAssessment(
      req.params.assessmentId, req.user.user_id, req.body.status, req.body.feedback
    );
    if (!result) return res.status(404).json({ error: 'Review not found' });
    audit.log(req.user.user_id, `collab.review_${req.body.status}`, 'approval_workflow', result.id,
      { assessment_id: req.params.assessmentId }, req).catch(() => {});
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/collab/review-status/:assessmentId
router.get('/review-status/:assessmentId', authenticate, async (req, res, next) => {
  try {
    const reviews = await collab.getReviewStatus(req.params.assessmentId);
    res.json({ reviews });
  } catch (err) { next(err); }
});

// GET /api/collab/pending-reviews
router.get('/pending-reviews', authenticate, async (req, res, next) => {
  try {
    const reviews = await collab.getPendingReviews(req.user.user_id);
    res.json({ reviews });
  } catch (err) { next(err); }
});

module.exports = router;
