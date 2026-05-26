import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  listOrganizations, getCurrentUser,
  inviteTeamMember, listOrgMembers, removeOrgMember, updateMemberRole,
  listPendingInvitations, cancelInvitation, getPendingReviews,
} from "../api";
import { useToast } from "../components/Toast";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin", desc: "Can manage members and all assessments", color: "var(--danger)" },
  { value: "reviewer", label: "Reviewer", desc: "Can review and approve assessments", color: "var(--primary)" },
  { value: "member", label: "Member", desc: "Can create and complete assessments", color: "var(--info)" },
  { value: "auditor", label: "Auditor", desc: "Read-only access to all data", color: "var(--text-muted)" },
];

export default function TeamManagement() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = getCurrentUser();
  const [orgs, setOrgs] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (orgId) => {
    setLoading(true);
    try {
      const [membersData, invitesData, reviewsData] = await Promise.all([
        listOrgMembers(orgId),
        listPendingInvitations(orgId).catch(() => ({ invitations: [] })),
        getPendingReviews().catch(() => ({ reviews: [] })),
      ]);
      setMembers(membersData.members || []);
      setInvitations(invitationsData.invitations || []);
      setPendingReviews(reviewsData.reviews || []);
    } catch (err) {
      toast.addToast("Failed to load team data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    listOrganizations().then(res => {
      setOrgs(res.organizations || []);
      const firstOrg = res.organizations?.[0];
      if (firstOrg) {
        setSelectedOrg(firstOrg.id);
        fetchData(firstOrg.id);
      }
    }).catch(() => setLoading(false));
  }, [fetchData]);

  const handleInvite = async () => {
    if (!inviteEmail || !selectedOrg) return;
    try {
      const result = await inviteTeamMember(selectedOrg, inviteEmail, inviteRole);
      toast.addToast(`Invitation sent to ${inviteEmail}`, "success");
      setInviteEmail("");
      setShowInvite(false);
      fetchData(selectedOrg);
    } catch (err) {
      toast.addToast("Failed to send invitation: " + err.message, "error");
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm("Remove this member?")) return;
    try {
      await removeOrgMember(selectedOrg, userId);
      toast.addToast("Member removed", "success");
      fetchData(selectedOrg);
    } catch (err) {
      toast.addToast("Failed to remove member", "error");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateMemberRole(selectedOrg, userId, newRole);
      toast.addToast("Role updated", "success");
      fetchData(selectedOrg);
    } catch (err) {
      toast.addToast("Failed to update role", "error");
    }
  };

  const handleReview = async (assessmentId, status, feedback) => {
    try {
      const { reviewAssessment } = await import("../api");
      await reviewAssessment(assessmentId, status, feedback);
      toast.addToast(status === "approved" ? "Assessment approved" : "Changes requested", "success");
      fetchData(selectedOrg);
    } catch (err) {
      toast.addToast("Review failed", "error");
    }
  };

  const currentRole = members.find(m => m.user_id === user?.user_id)?.role || "member";
  const canManage = currentRole === "owner" || currentRole === "admin";

  return (
    <div style={{ padding: "40px 32px", background: "var(--surface-hover)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-main)", margin: "0 0 4px 0" }}>
              Team Management
            </h1>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
              Manage team members, roles, invitations, and review workflows
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {canManage && (
              <button className="btn btn-primary" style={{ width: "auto", margin: 0 }} onClick={() => setShowInvite(true)}>
                + Invite Member
              </button>
            )}
            <button className="btn btn-back" onClick={() => navigate("/start")}>Back</button>
          </div>
        </div>

        {/* Pending Reviews Banner */}
        {pendingReviews.length > 0 && (
          <div style={{ marginBottom: 24, padding: "16px 20px", background: "var(--primary-bg-subtle)", border: "1px solid #bfdbfe", borderRadius: 10 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e40af", marginBottom: 4 }}>
              📋 {pendingReviews.length} Assessment{pendingReviews.length > 1 ? 's' : ''} Pending Your Review
            </div>
            {pendingReviews.map(pr => (
              <div key={pr.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "8px 12px", background: "var(--surface)", borderRadius: 8 }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>{pr.framework}</span>
                <button className="btn btn-primary" style={{ width: "auto", margin: 0, padding: "4px 12px", fontSize: "0.8rem" }}
                  onClick={() => navigate(`/dashboard-v2/${pr.assessment_id}`)}>
                  Review
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Org Selector */}
        {orgs.length > 1 && (
          <div style={{ marginBottom: 20 }}>
            <select value={selectedOrg || ""} onChange={e => { setSelectedOrg(e.target.value); fetchData(e.target.value); }}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem" }}>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}><div className="loader" style={{ margin: "0 auto 20px" }}></div><p style={{ color: "var(--text-muted)" }}>Loading...</p></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Members */}
            <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)", margin: "0 0 16px 0" }}>
                Members ({members.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {members.map(m => {
                  const roleInfo = ROLE_OPTIONS.find(r => r.value === m.role) || { label: m.role, color: "var(--text-muted)" };
                  const isSelf = m.user_id === user?.user_id;
                  return (
                    <div key={m.user_id} style={{ padding: "12px 16px", background: "var(--surface-hover)", borderRadius: 8, border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: 6 }}>
                          {m.email} {isSelf && <span style={{ fontSize: "0.65rem", color: "var(--text-light)" }}>(you)</span>}
                        </div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: roleInfo.color, background: `${roleInfo.color}10`, padding: "2px 8px", borderRadius: 4, display: "inline-block", marginTop: 4 }}>
                          {roleInfo.label}
                        </span>
                      </div>
                      {canManage && !isSelf && m.role !== "owner" && (
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <select value={m.role} onChange={e => handleRoleChange(m.user_id, e.target.value)}
                            style={{ fontSize: "0.75rem", padding: "4px 6px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                            {ROLE_OPTIONS.filter(r => r.value !== "owner").map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                          <button onClick={() => handleRemove(m.user_id)}
                            style={{ padding: "4px 8px", fontSize: "0.75rem", color: "var(--danger)", background: "var(--danger-bg)", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer" }}>
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pending Invitations */}
            <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)", margin: "0 0 16px 0" }}>
                Pending Invitations ({invitations.length})
              </h3>
              {invitations.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--text-light)", textAlign: "center", padding: 20 }}>No pending invitations</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {invitations.map(inv => (
                    <div key={inv.id} style={{ padding: "12px 16px", background: "var(--warning-bg)", borderRadius: 8, border: "1px solid #fed7aa", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-main)" }}>{inv.email}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--warning)" }}>Role: {inv.role} · Expires: {new Date(inv.expires_at).toLocaleDateString()}</div>
                      </div>
                      {canManage && (
                        <button onClick={() => cancelInvitation(inv.id).then(() => fetchData(selectedOrg))}
                          style={{ padding: "4px 8px", fontSize: "0.75rem", color: "var(--danger)", background: "var(--danger-bg)", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer" }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Role Info */}
              <div style={{ marginTop: 20, borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                <h4 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", margin: "0 0 8px 0", textTransform: "uppercase" }}>Roles</h4>
                {ROLE_OPTIONS.map(r => (
                  <div key={r.value} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color }} />
                    <strong style={{ color: r.color }}>{r.label}</strong> — {r.desc}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInvite && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.85)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
            onClick={() => setShowInvite(false)}>
            <div className="card" style={{ maxWidth: 440, padding: 32, position: "relative" }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowInvite(false)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-light)" }}>&times;</button>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)", marginBottom: 20 }}>Invite Team Member</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <input placeholder="Email address" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem" }} />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem" }}>
                  {ROLE_OPTIONS.filter(r => r.value !== "owner").map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
                </select>
                <div style={{ padding: "10px 14px", background: "var(--success-bg)", borderRadius: 8, fontSize: "0.8rem", color: "var(--success)" }}>
                  An invitation link will be generated. Share it with your team member to join this organization.
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button className="btn btn-primary" style={{ width: "auto", margin: 0, flex: 1 }} onClick={handleInvite}>Send Invitation</button>
                  <button className="btn btn-back" style={{ margin: 0 }} onClick={() => setShowInvite(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
