const { query } = require('../config/postgres');
const crypto = require('crypto');

// ─── Org Members ────────────────────────────────────────────

async function addOrgMember(orgId, userId, role = 'member', invitedBy) {
  const result = await query(
    `INSERT INTO org_members (org_id, user_id, role, status, invited_by)
     VALUES ($1, $2, $3, 'active', $4)
     ON CONFLICT (org_id, user_id) DO UPDATE SET status = 'active', role = EXCLUDED.role
     RETURNING *`,
    [orgId, userId, role, invitedBy]
  );
  return result.rows[0];
}

async function removeOrgMember(orgId, userId) {
  await query(
    'DELETE FROM org_members WHERE org_id = $1 AND user_id = $2 AND role != $3',
    [orgId, userId, 'owner']
  );
}

async function listOrgMembers(orgId) {
  const result = await query(
    `SELECT om.*, u.email, u.created_at as user_since
     FROM org_members om
     JOIN users u ON u.id = om.user_id
     WHERE om.org_id = $1
     ORDER BY om.role = 'owner' DESC, om.created_at ASC`,
    [orgId]
  );
  return result.rows;
}

async function updateMemberRole(orgId, userId, newRole) {
  const result = await query(
    `UPDATE org_members SET role = $1 WHERE org_id = $2 AND user_id = $3 AND role != 'owner' RETURNING *`,
    [newRole, orgId, userId]
  );
  return result.rows[0] || null;
}

async function getUserOrgRole(userId, orgId) {
  const result = await query(
    'SELECT role, status FROM org_members WHERE user_id = $1 AND org_id = $2',
    [userId, orgId]
  );
  return result.rows[0] || null;
}

// ─── Invitations ─────────────────────────────────────────────

async function createInvitation(orgId, email, role, invitedBy) {
  const token = crypto.randomBytes(32).toString('hex');
  const result = await query(
    `INSERT INTO invitations (org_id, email, role, invited_by, token)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [orgId, email, role, invitedBy, token]
  );
  return result.rows[0];
}

async function getInvitationByToken(token) {
  const result = await query(
    `SELECT i.*, o.name as org_name
     FROM invitations i
     JOIN organizations o ON o.id = i.org_id
     WHERE i.token = $1 AND i.status = 'pending' AND i.expires_at > NOW()`,
    [token]
  );
  return result.rows[0] || null;
}

async function acceptInvitation(token, userId) {
  const invite = await getInvitationByToken(token);
  if (!invite) return null;

  await query('UPDATE invitations SET status = $1 WHERE id = $2', ['accepted', invite.id]);
  const member = await addOrgMember(invite.org_id, userId, invite.role, invite.invited_by);
  return { invite, member };
}

async function listPendingInvitations(orgId) {
  const result = await query(
    `SELECT i.*, u.email as invited_by_email
     FROM invitations i
     LEFT JOIN users u ON u.id = i.invited_by
     WHERE i.org_id = $1 AND i.status = 'pending'
     ORDER BY i.created_at DESC`,
    [orgId]
  );
  return result.rows;
}

async function cancelInvitation(inviteId) {
  await query('UPDATE invitations SET status = $1 WHERE id = $2', ['expired', inviteId]);
}

// ─── Assessment Assignments ──────────────────────────────────

async function assignSection(assessmentId, userId, frameworkId, assignedBy) {
  const result = await query(
    `INSERT INTO assessment_assignments (assessment_id, user_id, framework_id, assigned_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [assessmentId, userId, frameworkId, assignedBy]
  );
  return result.rows[0];
}

async function getAssignments(assessmentId) {
  const result = await query(
    `SELECT aa.*, u.email as user_email, f.name as framework_name
     FROM assessment_assignments aa
     JOIN users u ON u.id = aa.user_id
     LEFT JOIN frameworks f ON f.id = aa.framework_id
     WHERE aa.assessment_id = $1
     ORDER BY aa.created_at`,
    [assessmentId]
  );
  return result.rows;
}

async function updateAssignmentStatus(assignmentId, status) {
  const result = await query(
    'UPDATE assessment_assignments SET status = $1 WHERE id = $2 RETURNING *',
    [status, assignmentId]
  );
  return result.rows[0] || null;
}

async function getMyAssignments(userId) {
  const result = await query(
    `SELECT aa.*, a.framework as assessment_framework, a.status as assessment_status,
            f.name as framework_name, u.email as assigned_by_email
     FROM assessment_assignments aa
     JOIN assessments a ON a.id = aa.assessment_id
     LEFT JOIN frameworks f ON f.id = aa.framework_id
     LEFT JOIN users u ON u.id = aa.assigned_by
     WHERE aa.user_id = $1
     ORDER BY aa.created_at DESC`,
    [userId]
  );
  return result.rows;
}

// ─── Approval Workflow ───────────────────────────────────────

async function submitForReview(assessmentId, reviewerId) {
  const result = await query(
    `INSERT INTO approval_workflow (assessment_id, reviewer_id, status)
     VALUES ($1, $2, 'pending_review')
     ON CONFLICT (assessment_id, reviewer_id) DO UPDATE SET status = 'pending_review', updated_at = NOW()
     RETURNING *`,
    [assessmentId, reviewerId]
  );
  return result.rows[0];
}

async function reviewAssessment(assessmentId, reviewerId, status, feedback) {
  const result = await query(
    `UPDATE approval_workflow
     SET status = $1, feedback = $2, updated_at = NOW()
     WHERE assessment_id = $3 AND reviewer_id = $4
     RETURNING *`,
    [status, feedback, assessmentId, reviewerId]
  );
  return result.rows[0] || null;
}

async function getReviewStatus(assessmentId) {
  const result = await query(
    `SELECT aw.*, u.email as reviewer_email
     FROM approval_workflow aw
     JOIN users u ON u.id = aw.reviewer_id
     WHERE aw.assessment_id = $1`,
    [assessmentId]
  );
  return result.rows;
}

async function getPendingReviews(reviewerId) {
  const result = await query(
    `SELECT aw.*, a.framework, a.compliance_score, a.status as assessment_status,
            o.name as org_name
     FROM approval_workflow aw
     JOIN assessments a ON a.id = aw.assessment_id
     JOIN organizations o ON o.id = a.org_id
     WHERE aw.reviewer_id = $1 AND aw.status = 'pending_review'
     ORDER BY aw.created_at DESC`,
    [reviewerId]
  );
  return result.rows;
}

module.exports = {
  addOrgMember, removeOrgMember, listOrgMembers, updateMemberRole, getUserOrgRole,
  createInvitation, getInvitationByToken, acceptInvitation, listPendingInvitations, cancelInvitation,
  assignSection, getAssignments, updateAssignmentStatus, getMyAssignments,
  submitForReview, reviewAssessment, getReviewStatus, getPendingReviews,
};
