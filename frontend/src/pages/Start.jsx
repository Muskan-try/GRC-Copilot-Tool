import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { logout, getCurrentUser, listDashboards, deleteAssessmentV2, getProfile, setCurrentUser, listPolicies, listPendingFixes, approvePolicy, rejectPolicy, approveResponse, rejectResponse, listPendingPolicies } from "../api";
import { useToast } from "../components/Toast";
import { useTheme } from "../contexts/ThemeContext";

const ASSESSMENT_INFO = [
  {
    id: "full",
    title: "Full Assessment",
    icon: "🛡️",
    details: "A comprehensive audit of all security controls and sub-controls. This assessment requires extensive evidence collection and maturity scoring across all selected domains.",
    steps: "1. Scope Definition. 2. Framework Selection. 3. Evidence Collection. 4. Maturity Scoring. 5. Analysis & Reporting.",
    requirements: "Full access to policies, technical configurations, and department heads. Estimated time: 2-5 days.",
    outcomes: "CISO-ready report, detailed gap analysis, evidence repository, and insurance readiness score."
  },
  {
    id: "quick",
    title: "Quick Assessment",
    icon: "⚡",
    details: "A high-level check focused on the most critical security controls. Designed for a rapid overview of compliance status without deep-dive evidence requirements.",
    steps: "1. Framework Selection. 2. Critical Control Questionnaire. 3. Instant Result Generation.",
    requirements: "General knowledge of security practices. Estimated time: 10-15 minutes.",
    outcomes: "Instant compliance score, top 3 risks identified, and high-level remediation plan."
  },
  {
    id: "gap",
    title: "Gap Assessment",
    icon: "🔍",
    details: "Specifically designed to identify discrepancies between your current state and a target compliance framework or standard.",
    steps: "1. Select Target Framework. 2. Map existing controls. 3. Identify missing elements. 4. Create Roadmap.",
    requirements: "Detailed documentation of existing controls and processes.",
    outcomes: "Detailed Gap Register and prioritized roadmap for remediation."
  },
  {
    id: "risk",
    title: "Risk Assessment",
    icon: "⚠️",
    details: "Focuses on identifying, analyzing, and evaluating organizational risks based on likelihood and impact across all business domains.",
    steps: "1. Asset Identification. 2. Threat & Vulnerability Analysis. 3. Likelihood/Impact Scoring. 4. Risk Treatment Plan.",
    requirements: "Access to business risk register and asset inventory.",
    outcomes: "Heat map, prioritized risk register, and recommended treatment strategies."
  },
  {
    id: "internal",
    title: "Internal Audit",
    icon: "📋",
    details: "A formal self-assessment to ensure internal policies are being followed and controls are operating effectively before an official external audit.",
    steps: "1. Audit Plan. 2. Control Testing. 3. Evidence Review. 4. Corrective Action Plan.",
    requirements: "Access to internal audit checklists and control owners.",
    outcomes: "Internal audit report and identified non-conformities list."
  },
  {
    id: "vendor",
    title: "Vendor Assessment",
    icon: "🤝",
    details: "Evaluate the security posture of third-party partners and supply chain members to ensure they meet your data protection standards.",
    steps: "1. Vendor Profile. 2. Questionnaire distribution. 3. Response validation. 4. Risk Tiering.",
    requirements: "Vendor contact and service level agreements (SLAs).",
    outcomes: "Vendor Risk Scorecard and supply chain risk profile."
  },
  {
    id: "agent",
    title: "AI Compliance Agent",
    icon: "🤖",
    details: "An AI-powered continuous assurance engine. Connects via APIs/SSH to GitHub, AWS, Jira, and Identity Providers to pull data on a schedule, verifies that security policies are actually enforced (not just documented), and auto-remediates gaps by opening Jira tickets or Git Pull Requests pending human approval.",
    steps: "1. Active Fetching — connects to live systems and pulls compliance data automatically. 2. Execution Verification — tests whether controls like MFA, encryption, and access policies are actively enforced. 3. Gap Analysis — maps findings against target frameworks. 4. Automated Remediation — opens Jira tickets or PRs to close identified gaps.",
    requirements: "API credentials or SSH access to GitHub, AWS, Jira, and Identity Providers.",
    outcomes: "Real-time compliance posture, verified control enforcement, prioritized gap register, and auto-generated remediation tickets/PRs awaiting human approval.",
    isAgent: true
  }
];

/**
 * Map backend assessment_type + analysis_depth to frontend display type.
 */
function getFrontendType(a) {
  let assessmentType = a.assessment_type;
  const depth = a.analysis_depth || "quick";

  // Fallback for very old assessments where assessment_type might be missing
  if (!assessmentType) {
    if (depth === "comprehensive" || depth === "full") return "full";
    return "quick";
  }

  if (assessmentType === "gap_assessment" || assessmentType === "gap_analysis") return "gap";
  if (assessmentType === "risk_assessment") return "risk";
  if (assessmentType === "vendor_assessment") return "vendor";
  if (assessmentType === "internal_audit") return "internal";
  if (assessmentType === "full_assessment") return "full";

  // compliance_assessment maps to quick or full based on depth
  if (assessmentType === "compliance_assessment") {
    if (depth === "comprehensive" || depth === "full") return "full";
    return "quick";
  }

  return "quick";
}

/**
 * Safely parse a score from the backend (comes as string from pg).
 */
function safeScore(val) {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

export default function Start() {
  const navigate = useNavigate();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const user = getCurrentUser();
  const [assessments, setAssessments] = useState([]);
  const [overlayInfo, setOverlayInfo] = useState(null);
  const [activeSummary, setActiveSummary] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteAssessmentId, setDeleteAssessmentId] = useState(null);
  const [pendingPolicies, setPendingPolicies] = useState([]);
  const [pendingFixes, setPendingFixes] = useState([]);
  const [viewingPolicy, setViewingPolicy] = useState(null);

  const fetchStats = async () => {
    setRefreshing(true);
    try {
      // Sync profile data dynamically on fetch to ensure invited users detect real-time role/org updates immediately
      try {
        const profile = await getProfile();
        const storedUser = getCurrentUser();
        if (profile && (profile.organization?.org_id !== storedUser?.org_id || profile.role !== storedUser?.role)) {
          const updatedUser = {
            ...storedUser,
            org_id: profile.organization?.org_id,
            role: profile.role,
            email: profile.email
          };
          setCurrentUser(updatedUser);
          window.location.reload();
          return;
        }
      } catch (profileErr) {
        console.warn("Failed to sync profile context:", profileErr);
      }

      const res = await listDashboards();
      setAssessments(res.assessments || []);

      // If user is team lead (lead), fetch pending checks
      const currentUser = getCurrentUser();
      if (currentUser?.role === 'lead') {
        const [policiesData, fixesData] = await Promise.all([
          listPendingPolicies().catch(() => ({ policies: [] })),
          listPendingFixes().catch(() => ({ fixes: [] }))
        ]);
        setPendingPolicies(policiesData.policies || []);
        setPendingFixes(fixesData.fixes || fixesData.responses || []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
      toast.addToast("Failed to load assessments", "error");
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  const handleApprovePolicy = async (policyId) => {
    try {
      await approvePolicy(policyId);
      toast.addToast("Policy approved successfully", "success");
      fetchStats();
    } catch (err) {
      toast.addToast("Failed to approve policy: " + err.message, "error");
    }
  };

  const handleRejectPolicy = async (policyId) => {
    try {
      await rejectPolicy(policyId);
      toast.addToast("Policy marked as gaps found", "warning");
      fetchStats();
    } catch (err) {
      toast.addToast("Failed to reject policy: " + err.message, "error");
    }
  };

  const handleApproveResponse = async (responseId) => {
    try {
      await approveResponse(responseId);
      toast.addToast("Fix response approved successfully", "success");
      fetchStats();
    } catch (err) {
      toast.addToast("Failed to approve response: " + err.message, "error");
    }
  };

  const handleRejectResponse = async (responseId) => {
    try {
      await rejectResponse(responseId);
      toast.addToast("Fix response marked as rejected", "warning");
      fetchStats();
    } catch (err) {
      toast.addToast("Failed to reject response: " + err.message, "error");
    }
  };

  const handleDeleteAssessment = (assessmentId) => {
    setDeleteAssessmentId(assessmentId);
  };

  const confirmDeleteAssessment = async () => {
    if (!deleteAssessmentId) return;
    try {
      await deleteAssessmentV2(deleteAssessmentId);
      toast.addToast("Assessment deleted successfully", "success");
      setDeleteAssessmentId(null);
      fetchStats();
    } catch (err) {
      console.error("Failed to delete assessment:", err);
      toast.addToast(err.message || "Failed to delete assessment", "error");
      setDeleteAssessmentId(null);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const typeGroups = useMemo(() => {
    // Initialize groups for all types defined in ASSESSMENT_INFO
    const groups = {};
    ASSESSMENT_INFO.forEach((info) => {
      groups[info.id] = {
        total: 0,
        completed: 0,
        pending: 0,
        scores: [],
        title: info.title,
        icon: info.icon,
      };
    });

    // Populate with actual data from assessments
    assessments.forEach((a) => {
      // AI agent assessments always count under "agent" type
      const type = a.is_agent ? "agent" : getFrontendType(a);
      if (groups[type]) {
        groups[type].total++;
        if (a.status === "complete") {
          groups[type].completed++;
        } else {
          groups[type].pending++;
        }
        const score = safeScore(a.compliance_score);
        if (score > 0) {
          groups[type].scores.push(score);
        }
      }
    });
    return groups;
  }, [assessments]);

  const globalHealth = useMemo(() => {
    const scored = assessments.filter((a) => a.compliance_score !== null && a.compliance_score !== undefined && a.compliance_score !== "0");
    if (scored.length === 0) return 0;
    const scores = scored.map((a) => safeScore(a.compliance_score));
    const sum = scores.reduce((acc, s) => acc + s, 0);
    return Math.round(sum / scored.length);
  }, [assessments]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    navigate("/");
  };

  const startNewFlow = (type = "quick") => {
    sessionStorage.setItem("assessmentType", type);
    navigate("/assessment");
  };

  return (
    <div
      className="page"
      style={{
        background: "var(--bg-color)",
        flexDirection: "row",
        alignItems: "stretch",
        padding: 0,
        justifyContent: "flex-start",
        overflow: "hidden",
      }}
    >
      {/* SIDEBAR */}
      <div
        style={{
          width: 280,
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--cyber-border)",
          display: "flex",
          flexDirection: "column",
          padding: "30px 0",
        }}
      >
        <div style={{ padding: "0 24px 30px" }}>
          <h2
            style={{
              color: "var(--primary)",
              fontSize: "0.9rem",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: 20,
            }}
          >
            {user?.role === 'lead' ? "Read-Only Portal" : "Assessments"}
          </h2>
        </div>

        <nav style={{ flex: 1 }}>
          {user?.role === 'lead' ? (
            <button
              style={{
                width: "100%",
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "var(--hover-subtle)",
                border: "none",
                cursor: "default",
                textAlign: "left",
                transition: "all 0.2s ease",
                color: "var(--primary)",
                borderLeft: "3px solid var(--primary)",
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>📊</span>
              <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>GRC Dashboard</span>
            </button>
          ) : (
            ASSESSMENT_INFO.map((item) => (
              <button
                key={item.id}
                onClick={() => setOverlayInfo(item)}
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  color: "var(--text-on-dark)",
                  borderLeft: "3px solid transparent",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-subtle)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{item.title}</span>
              </button>
            ))
          )}
        </nav>

        <div style={{ padding: "24px", borderTop: "1px solid var(--border-light)", display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { label: "Audit Trail", path: "/audit-logs" },
            { label: "Calendar", path: "/compliance-calendar" },
            { label: "Team", path: "/team" },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                width: "100%",
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
                color: "var(--text-on-dark)",
                borderLeft: "3px solid transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-subtle)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: "1.2rem" }}>{item.label === "Audit Trail" ? "\u{1F50D}" : item.label === "Calendar" ? "\u{1F4C5}" : "\u{1F91D}"}</span>
              <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{item.label}</span>
            </button>
          ))}
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "16px 24px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease",
              color: "var(--danger)",
              borderLeft: "3px solid transparent",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-subtle)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: "1.2rem" }}>{"\u{1F6AA}"}</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Logout</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          color: "var(--text-main)",
          overflowY: "auto",
        }}
      >
        {/* TOP HEADER */}
        <header
          style={{
            padding: "20px 40px",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--header-bg)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "var(--text-main)",
            }}
          >
            GRC tool <span style={{ color: "var(--primary)", fontWeight: 400 }}>Dashboard</span>
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <span style={{ fontSize: "0.85rem", color: theme === "dark" ? "var(--text-light)" : "var(--warning)", transition: "color 0.2s" }}>
                {"\u2600\uFE0F"}
              </span>
              <div
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: theme === "dark" ? "var(--primary)" : "#cbd5e1",
                  position: "relative",
                  transition: "background 0.2s",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "var(--surface)",
                    position: "absolute",
                    top: 2,
                    left: theme === "dark" ? 18 : 2,
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </div>
              <span style={{ fontSize: "0.85rem", color: theme === "dark" ? "var(--warning)" : "var(--text-light)", transition: "color 0.2s" }}>
                {"\u{1F319}"}
              </span>
            </div>
            <span style={{ color: "var(--border-color)", fontSize: "0.8rem" }}>|</span>
            <button
              onClick={fetchStats}
              style={{
                width: 130,
                justifyContent: "center",
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-color)",
                background: "var(--header-bg)",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ display: refreshing ? "inline-block" : "none", width: 12, height: 12, border: "2px solid var(--text-light)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <div style={{ textAlign: "right", fontSize: "0.85rem", color: "var(--text-muted)", display: 'flex', alignItems: 'center', gap: 10 }}>
              {user?.role === 'admin' && (
                <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>Admin</span>
              )}
              <div>
                Welcome, <strong>{user?.email?.split("@")[0]}</strong>
                <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>{user?.role?.replace('_', ' ')}</div>
              </div>
            </div>
          </div>
        </header>

        {/* CENTER CONTENT */}
        <div style={{ padding: "60px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {user?.role === 'lead' ? (
            <div style={{ maxWidth: 1000, width: "100%" }}>
              <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", padding: 32, borderRadius: 24, color: "#fff", marginBottom: 40, border: "1px solid var(--cyber-border)", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, background: "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0) 70%)", borderRadius: "50%" }} />
                <div style={{ display: "inline-block", background: "rgba(59, 130, 246, 0.15)", color: "var(--primary)", padding: "6px 14px", borderRadius: 8, fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
                  Checker Validation Portal
                </div>
                <h2 style={{ margin: 0, fontSize: "2rem", fontWeight: 900, color: "#fff", textAlign: "left" }}>GRC Compliance Dashboard</h2>
                <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: "8px 0 0 0", lineHeight: 1.6, textAlign: "left" }}>
                  Welcome back, Checker! You have validator credentials. Below is the complete record of compliance assessments and reports, along with items awaiting your review and authorization.
                </p>
              </div>

              {/* Checker Alert & Validation Panel */}
              <div style={{ 
                background: "var(--bg-subtle, rgba(30, 41, 59, 0.5))", 
                borderRadius: 20, 
                border: "1px solid var(--cyber-border)", 
                padding: 24, 
                marginBottom: 40,
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
              }}>
                <h3 style={{ margin: "0 0 20px 0", fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
                  🔔 Checker Alert & Validation Panel
                </h3>

                {/* Pending Policy Approval Section — single full-width card */}
                <div style={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 20 }}>
                  <h4 style={{ margin: "0 0 16px 0", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>📄 Pending Policy Approval</span>
                    <span style={{ background: "var(--primary-subtle, rgba(59, 130, 246, 0.1))", color: "var(--primary)", padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 800 }}>
                      {pendingPolicies.length}
                    </span>
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 320, overflowY: "auto" }}>
                    {pendingPolicies.length > 0 ? (
                      pendingPolicies.map(policy => (
                        <div key={policy.id} style={{ padding: "14px 16px", background: "var(--sidebar-bg)", borderRadius: 12, border: "1px solid var(--border-color)" }}>
                          {/* Top row: name + type */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                              <div style={{ fontWeight: 700, color: "var(--text-main)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                                {policy.policy_name}
                              </div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
                                Type: {policy.policy_type || "Standard"}
                              </div>
                            </div>
                            <span style={{ flexShrink: 0, background: "rgba(99, 102, 241, 0.1)", color: "#6366f1", padding: "3px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase" }}>
                              Awaiting Sign-off
                            </span>
                          </div>
                          {/* Action buttons row */}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              onClick={() => setViewingPolicy(policy)}
                              style={{ flex: 1, minWidth: 100, padding: "7px 10px", fontSize: "0.75rem", fontWeight: 700, background: "var(--surface)", color: "var(--text-main)", border: "1px solid var(--border-color)", borderRadius: 8, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                              onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.borderColor = "var(--primary)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--border-color)"; }}
                            >
                              👁 View Updated Policy
                            </button>
                            <button
                              onClick={() => handleApprovePolicy(policy.id)}
                              style={{ flex: 1, minWidth: 80, padding: "7px 10px", fontSize: "0.75rem", fontWeight: 700, background: "#10b981", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", transition: "opacity 0.2s" }}
                              onMouseEnter={e => e.currentTarget.style.opacity = 0.85}
                              onMouseLeave={e => e.currentTarget.style.opacity = 1}
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => handleRejectPolicy(policy.id)}
                              style={{ flex: 1, minWidth: 80, padding: "7px 10px", fontSize: "0.75rem", fontWeight: 700, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", transition: "opacity 0.2s" }}
                              onMouseEnter={e => e.currentTarget.style.opacity = 0.85}
                              onMouseLeave={e => e.currentTarget.style.opacity = 1}
                            >
                              ✗ Reject
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>
                        No pending policy approvals.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* STATS OVERVIEW */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 40 }}>
                <div className="card" style={{ padding: 24, textAlign: "left", borderLeft: "5px solid var(--primary)" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-light)", textTransform: "uppercase", marginBottom: 6 }}>Global Maturity Health</div>
                  <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--text-main)" }}>{globalHealth}%</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>Average organization score</div>
                </div>
                <div className="card" style={{ padding: 24, textAlign: "left", borderLeft: "5px solid var(--success)" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-light)", textTransform: "uppercase", marginBottom: 6 }}>Completed Audits</div>
                  <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--text-main)" }}>
                    {assessments.filter(a => a.status === "complete").length}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>Fully generated reports</div>
                </div>
                <div className="card" style={{ padding: 24, textAlign: "left", borderLeft: "5px solid var(--warning)" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-light)", textTransform: "uppercase", marginBottom: 6 }}>Active Assessments</div>
                  <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--text-main)" }}>
                    {assessments.filter(a => a.status !== "complete").length}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>In progress by Team Lead</div>
                </div>
              </div>

              {/* ASSESSMENTS TABLE */}
              <div style={{ textAlign: "left" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                  📋 Organization Assessment Records
                </h3>

                <div style={{ overflow: "hidden", borderRadius: 16, border: "1px solid var(--border-color)", background: "var(--surface)", boxShadow: "var(--shadow-sm)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--sidebar-bg)", textAlign: "left", borderBottom: "2px solid var(--border-color)" }}>
                        <th style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800 }}>Assessment Details</th>
                        <th style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800 }}>Target Framework</th>
                        <th style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800 }}>Maturity Score</th>
                        <th style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800 }}>Status</th>
                        <th style={{ padding: "16px 24px", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 800, textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.length > 0 ? (
                        assessments.map((a) => {
                          const aType = a.is_agent ? "agent" : getFrontendType(a);
                          const typeInfo = ASSESSMENT_INFO.find(info => info.id === aType);
                          const score = safeScore(a.compliance_score);
                          const badgeBg = a.status === 'complete' ? (score >= 80 ? '#f0fdf4' : score >= 50 ? '#fffbeb' : '#fef2f2') : '#f8fafc';
                          const badgeText = a.status === 'complete' ? (score >= 80 ? '#166534' : score >= 50 ? '#92400e' : '#991b1b') : '#64748b';
                          const badgeBorder = a.status === 'complete' ? (score >= 80 ? '#bbf7d0' : score >= 50 ? '#fde68a' : '#fecaca') : '#e2e8f0';

                          return (
                            <tr key={a.id} style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.2s" }}
                                onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              <td style={{ padding: "16px 24px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{ fontSize: "1.5rem" }}>{typeInfo?.icon || "🛡️"}</span>
                                  <div>
                                    <div style={{ fontWeight: 800, color: "var(--text-main)" }}>{typeInfo?.title || "Security Assessment"}</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>Org: {a.org_name || "Primary"}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: "16px 24px", color: "var(--text-main)", fontWeight: 600 }}>{a.framework || "N/A"}</td>
                              <td style={{ padding: "16px 24px" }}>
                                {a.status === 'complete' ? (
                                  <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 800, background: badgeBg, color: badgeText, border: `1px solid ${badgeBorder}` }}>
                                    {Math.round(score)}% Compliant
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                    Pending Audit
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "16px 24px" }}>
                                <span style={{
                                  padding: "4px 10px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase",
                                  background: a.status === 'complete' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                  color: a.status === 'complete' ? '#22c55e' : '#f59e0b'
                                }}>
                                  {a.status === 'complete' ? 'Completed' : 'In Progress'}
                                </span>
                              </td>
                              <td style={{ padding: "16px 24px", textAlign: "right" }}>
                                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                  {a.status === 'complete' ? (
                                    <>
                                      <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: "0.75rem", height: "auto", width: "auto", borderRadius: 8 }}
                                              onClick={() => navigate(`/dashboard-v2/${a.id}`)}>
                                        📊 View Dashboard
                                      </button>
                                      <button className="btn btn-outline" style={{ padding: "6px 14px", fontSize: "0.75rem", height: "auto", width: "auto", borderRadius: 8 }}
                                              onClick={() => navigate(`/report-v2/${a.id}`)}>
                                        📄 View Report
                                      </button>
                                    </>
                                  ) : (
                                    <button className="btn btn-outline" style={{ padding: "6px 14px", fontSize: "0.75rem", height: "auto", width: "auto", borderRadius: 8, border: "1px dashed var(--border-color)", cursor: "not-allowed" }} disabled>
                                      ⏳ Continuing by Lead
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
                            No active or completed assessments found in your organization.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 1000, width: "100%", textAlign: "center" }}>
              <h2 style={{ fontSize: "2.5rem", marginBottom: 20, fontWeight: 800 }}>Audit Performance</h2>
              <p className="subtitle" style={{ marginBottom: 48 }}>
                {user?.role === 'admin' ? "Global monitoring dashboard for all active organizations and security audits." : "A consolidated view of all your compliance activities and progress."}
              </p>

              {/* GLOBAL SUMMARY CARDS */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 48 }}>
                <div className="card" style={{ padding: 32, textAlign: "left", borderLeft: "6px solid var(--primary)" }}>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      color: "var(--text-light)",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    {user?.role === 'admin' ? "System-wide Health" : "Global Health"}
                  </div>
                  <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--text-main)" }}>
                    {globalHealth}%
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Average Compliance across {assessments.filter(a => a.compliance_score !== null && a.compliance_score !== undefined).length} scored assessments
                  </div>
                </div>

                <div className="card" style={{ padding: 32, textAlign: "left", borderLeft: "6px solid var(--success)" }}>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      color: "var(--text-light)",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Activity Summary
                  </div>
                  <div style={{ display: "flex", gap: 24, alignItems: "center", marginTop: 8 }}>
                    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setActiveSummary({ status: 'complete', type: null })}>
                      <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--success)" }}>
                        {assessments.filter((a) => a.status === "complete").length}
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: 8 }}>Done</span>
                    </div>
                    <div style={{ width: 1, height: 30, background: "var(--border-color)" }}></div>
                    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setActiveSummary({ status: 'pending', type: null })}>
                      <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--warning)" }}>
                        {assessments.filter((a) => a.status !== "complete").length}
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: 8 }}>In Progress</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="divider" style={{ margin: "48px 0" }} />

              {/* TYPE SPECIFIC SCOREBOARDS */}
              <div style={{ textAlign: "left", marginBottom: 32 }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)", marginBottom: 24 }}>
                  {user?.role === 'admin' ? "Global Assessment Metrics" : "Assessment Type Scoreboards"}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
                  {Object.keys(typeGroups).length > 0 ? (
                    Object.entries(typeGroups).map(([type, group]) => {
                      const avgScore =
                        group.scores.length > 0
                          ? Math.round(group.scores.reduce((a, b) => a + b, 0) / group.scores.length)
                          : 0;
                      return (
                        <div
                          key={type}
                          className="card"
                          style={{ padding: 24, border: "1px solid var(--border-color)", boxShadow: "var(--shadow-sm)" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                            <span style={{ fontSize: "1.5rem" }}>{group.icon}</span>
                            <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{group.title}</h4>
                          </div>

                          <div style={{ marginBottom: 24 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "0.85rem",
                                fontWeight: 700,
                                marginBottom: 8,
                              }}
                            >
                              <span style={{ color: "var(--text-muted)" }}>Overall Compliance</span>
                              <span style={{ color: "var(--primary)" }}>{avgScore}%</span>
                            </div>
                            <div style={{ height: 8, background: "var(--border-color)", borderRadius: 4, overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${avgScore}%`,
                                  height: "100%",
                                  background: "var(--primary)",
                                  transition: "width 0.5s",
                                }}
                              ></div>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              borderTop: "1px solid var(--border-color)",
                              paddingTop: 16,
                            }}
                          >
                            <div style={{ textAlign: "center", cursor: 'pointer' }} onClick={() => setActiveSummary({ status: 'complete', type: type })}>
                              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)" }}>
                                {group.completed}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--text-muted)",
                                  textTransform: "uppercase",
                                  fontWeight: 700,
                                }}
                              >
                                Completed
                              </div>
                            </div>
                            <div style={{ textAlign: "center", cursor: 'pointer' }} onClick={() => setActiveSummary({ status: 'pending', type: type })}>
                              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--warning)" }}>{group.pending}</div>
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--text-muted)",
                                  textTransform: "uppercase",
                                  fontWeight: 700,
                                }}
                              >
                                Pending
                              </div>
                            </div>
                            <div style={{ textAlign: "center", cursor: 'pointer' }} onClick={() => setActiveSummary({ status: 'all', type: type })}>
                              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-light)" }}>
                                {group.total}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--text-muted)",
                                  textTransform: "uppercase",
                                  fontWeight: 700,
                                }}
                              >
                                Total
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div
                      style={{
                        gridColumn: "1/-1",
                        padding: "60px",
                        background: "var(--surface-hover)",
                        borderRadius: 16,
                        textAlign: "center",
                        color: "var(--text-muted)",
                      }}
                    >
                      No assessment data available to generate scoreboards.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* POLICY VIEWER MODAL — Lead reads the AI-remediated report before approving */}
      {viewingPolicy && (
        <div
          onClick={() => setViewingPolicy(null)}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1200
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderRadius: 20,
              border: "1px solid var(--cyber-border)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
              width: "min(820px, 92vw)",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "22px 28px",
              borderBottom: "1px solid var(--border-color)",
              background: "var(--surface)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: "1.5rem" }}>📄</span>
                <div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>
                    {viewingPolicy.policy_name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                    AI-Remediated Draft — Awaiting Lead Sign-off
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingPolicy(null)}
                style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", color: "var(--text-light)", lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Score bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 28px",
              background: "var(--surface-hover)",
              borderBottom: "1px solid var(--border-color)"
            }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Compliance Score after remediation:</span>
              <span style={{
                fontSize: "1.35rem", fontWeight: 900,
                color: viewingPolicy.compliance_score >= 80 ? "#10b981" : viewingPolicy.compliance_score >= 50 ? "#f59e0b" : "#ef4444"
              }}>
                {viewingPolicy.compliance_score !== null && viewingPolicy.compliance_score !== undefined
                  ? `${parseFloat(viewingPolicy.compliance_score)}%`
                  : "N/A"}
              </span>
            </div>

            {/* Body — gaps / remediations */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              {viewingPolicy.ai_analysis_report?.gaps && viewingPolicy.ai_analysis_report.gaps.length > 0 ? (
                viewingPolicy.ai_analysis_report.gaps.map((gap, i) => {
                  const isObj = typeof gap === "object" && gap !== null;
                  const title = isObj ? gap.gap_title : `Gap #${i + 1}`;
                  const desc = isObj ? gap.description : gap;
                  const remediation = isObj ? gap.remediation_plan : viewingPolicy.ai_analysis_report.recommendations?.[i];
                  const priority = isObj ? gap.priority : "High";
                  const prio = String(priority).toLowerCase();
                  const prioColor = prio === "high" || prio === "critical" ? "#ef4444" : prio === "medium" ? "#f59e0b" : "#10b981";
                  return (
                    <div key={i} style={{
                      background: "var(--surface-hover)",
                      border: "1px solid var(--border-color)",
                      borderLeft: `4px solid ${prioColor}`,
                      borderRadius: 12,
                      padding: "18px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-main)" }}>{title}</span>
                        <span style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", color: prioColor, background: `${prioColor}18`, padding: "3px 8px", borderRadius: 6 }}>
                          {String(priority).toUpperCase()}
                        </span>
                      </div>
                      {desc && <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</p>}
                      {remediation && (
                        <div style={{ marginTop: 4, paddingTop: 10, borderTop: "1px dashed var(--border-color)" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.05em" }}>✨ Remediation Plan:</span>
                          <p style={{ margin: "4px 0 0 0", fontSize: "0.875rem", color: "var(--text-main)", lineHeight: 1.5 }}>{remediation}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic" }}>
                  No gaps found — this policy is fully remediated and ready for approval.
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div style={{
              display: "flex", gap: 12, padding: "18px 28px",
              borderTop: "1px solid var(--border-color)",
              background: "var(--surface)"
            }}>
              <button
                onClick={() => { handleApprovePolicy(viewingPolicy.id); setViewingPolicy(null); }}
                style={{ flex: 1, padding: "12px", fontSize: "0.9rem", fontWeight: 800, background: "#10b981", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", transition: "opacity 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.opacity = 0.85}
                onMouseLeave={e => e.currentTarget.style.opacity = 1}
              >
                ✓ Approve Policy
              </button>
              <button
                onClick={() => { handleRejectPolicy(viewingPolicy.id); setViewingPolicy(null); }}
                style={{ flex: 1, padding: "12px", fontSize: "0.9rem", fontWeight: 800, background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", transition: "opacity 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.opacity = 0.85}
                onMouseLeave={e => e.currentTarget.style.opacity = 1}
              >
                ✗ Reject
              </button>
              <button
                onClick={() => setViewingPolicy(null)}
                style={{ padding: "12px 20px", fontSize: "0.9rem", fontWeight: 700, background: "none", border: "1px solid var(--border-color)", color: "var(--text-light)", borderRadius: 10, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY MODAL */}
      {overlayInfo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "var(--overlay-bg)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setOverlayInfo(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 700, padding: 50, position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOverlayInfo(null)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                background: "none",
                border: "none",
                fontSize: "2rem",
                cursor: "pointer",
                color: "var(--text-light)",
              }}
            >
              &times;
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <span style={{ fontSize: "3rem" }}>{overlayInfo.icon}</span>
              <h2 style={{ margin: 0, fontSize: "2rem" }}>{overlayInfo.title}</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <section>
                <h4
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    color: "var(--primary)",
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}
                >
                  Description
                </h4>
                <p style={{ lineHeight: 1.6, color: "var(--text-main)" }}>{overlayInfo.details}</p>
              </section>

              <section>
                <h4
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    color: "var(--primary)",
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}
                >
                  Workflow Steps
                </h4>
                <p style={{ lineHeight: 1.6, color: "var(--text-main)" }}>{overlayInfo.steps}</p>
              </section>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <section>
                  <h4
                    style={{
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      color: "var(--primary)",
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                    }}
                  >
                    Requirements
                  </h4>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{overlayInfo.requirements}</p>
                </section>
                <section>
                  <h4
                    style={{
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      color: "var(--primary)",
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                    }}
                  >
                    Outcomes
                  </h4>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{overlayInfo.outcomes}</p>
                </section>
              </div>

              <div style={{ marginTop: 24, display: "flex", gap: 16 }}>
                {user?.role === 'lead' ? (
                  <div style={{ width: '100%', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', textAlign: 'center', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                    Read-Only Access: You do not have permission to start assessments.
                  </div>
                ) : (
                  <>
                    {overlayInfo.isAgent ? (
                      <button className="btn btn-primary" onClick={() => navigate("/agent")} style={{ width: "100%" }}>
                        Launch AI Agent
                      </button>
                    ) : (overlayInfo.id === "full" || overlayInfo.id === "quick") && (
                      <button
                        className="btn btn-primary"
                        onClick={() => startNewFlow(overlayInfo.id)}
                        style={{ width: "100%" }}
                      >
                        Start Assessment
                      </button>
                    )}
                  </>
                )}
                <button className="btn btn-outline" onClick={() => setOverlayInfo(null)} style={{ width: "100%" }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE SUMMARY LIST MODAL */}
      {activeSummary && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "var(--overlay-bg)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setActiveSummary(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 800, width: '90%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                    {activeSummary.type ? ASSESSMENT_INFO.find(i => i.id === activeSummary.type)?.title : ''} {activeSummary.status === 'complete' ? 'Completed' : activeSummary.status === 'pending' ? 'In Progress' : 'Total'} Assessments
                </h2>
                <button
                    onClick={() => setActiveSummary(null)}
                    style={{ background: "none", border: "none", fontSize: "2rem", cursor: "pointer", color: "var(--text-light)" }}
                >
                    &times;
                </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                            <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                            <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Framework</th>
                            <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status / Score</th>
                            <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                            <th style={{ padding: '12px 8px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {assessments
                            .filter(a => {
                                const statusMatch = activeSummary.status === 'all' || (activeSummary.status === 'complete' ? a.status === 'complete' : a.status !== 'complete');
                                const aType = a.is_agent ? "agent" : getFrontendType(a);
                                const typeMatch = !activeSummary.type || aType === activeSummary.type;
                                return statusMatch && typeMatch;
                            })
                            .map(a => {
                                const aType = a.is_agent ? "agent" : getFrontendType(a);
                                const typeInfo = ASSESSMENT_INFO.find(info => info.id === aType);
                                const isAgent = a.is_agent || false;
                                return (
                                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} 
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '16px 8px' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{typeInfo?.title || 'Assessment'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.org_name || 'Organization'}</div>
                                        </td>
                                        <td style={{ padding: '16px 8px', color: 'var(--text-main)', fontSize: '0.9rem' }}>{a.framework || 'N/A'}</td>
                                        <td style={{ padding: '16px 8px' }}>
                                            <span style={{ 
                                                fontWeight: 800, 
                                                fontSize: '1rem',
                                                color: a.status === 'complete' ? '#22c55e' : '#f59e0b' 
                                            }}>
                                                {a.status === 'complete' ? `${Math.round(a.compliance_score)}%` : `Progress: ${a.answered_questions || 0}/${a.total_questions || 0}`}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {new Date(a.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                                             {isAgent ? (
                                                 <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>AI Agent Run</span>
                                             ) : (
                                                 <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                     <button 
                                                         className="btn btn-primary" 
                                                         style={{ padding: '8px 16px', fontSize: '0.8rem', height: 'auto', width: 'auto', borderRadius: 8 }}
                                                         onClick={() => navigate(a.status === 'complete' ? `/dashboard-v2/${a.id}` : `/questionnaire-enhanced/${a.id}`)}
                                                     >
                                                         {a.status === 'complete' ? 'View Results' : user?.role === 'lead' ? 'View Progress' : 'Continue'}
                                                     </button>
                                                     {a.status !== 'complete' && user?.role !== 'lead' && (
                                                         <button 
                                                             className="btn" 
                                                             style={{ 
                                                                 padding: '8px 16px', 
                                                                 fontSize: '0.8rem', 
                                                                 height: 'auto', 
                                                                 width: 'auto', 
                                                                 borderRadius: 8,
                                                                 background: 'var(--danger)',
                                                                 color: '#fff',
                                                                 border: 'none',
                                                                 cursor: 'pointer',
                                                                 transition: 'opacity 0.2s'
                                                             }}
                                                             onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                                                             onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                                             onClick={() => handleDeleteAssessment(a.id)}
                                                         >
                                                             Delete
                                                         </button>
                                                     )}
                                                 </div>
                                             )}
                                         </td>
                                    </tr>
                                );
                            })
                        }
                        {assessments.filter(a => {
                            const statusMatch = activeSummary.status === 'all' || (activeSummary.status === 'complete' ? a.status === 'complete' : a.status !== 'complete');
                            const typeMatch = !activeSummary.type || getFrontendType(a) === activeSummary.type;
                            return statusMatch && typeMatch;
                        }).length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No assessments found in this category.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRM MODAL */}
      {showLogoutConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "var(--overlay-bg)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
          }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="card"
            style={{ maxWidth: 400, padding: 40, textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>{"\u{1F6AA}"}</div>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "1.3rem", fontWeight: 700, color: "var(--text-main)" }}>
              Leave so soon?
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 28 }}>
              Are you sure you want to log out? Any unsaved data will be lost.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-primary"
                style={{ margin: 0 }}
                onClick={confirmLogout}
              >
                Logout
              </button>
              <button
                className="btn btn-outline"
                style={{ margin: 0 }}
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ASSESSMENT CONFIRMATION MODAL */}
      {deleteAssessmentId && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "var(--overlay-bg)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
          }}
          onClick={() => setDeleteAssessmentId(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 420, padding: 32, textAlign: "center", border: "1px solid var(--cyber-border)", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>⚠️</div>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)" }}>
              Delete Assessment?
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: 24, lineHeight: "1.5" }}>
              Are you sure you want to delete this in-progress assessment? This action cannot be undone and all collected answers will be permanently lost.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                className="btn"
                style={{
                  margin: 0,
                  padding: "10px 20px",
                  borderRadius: 8,
                  background: "var(--danger)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                onClick={confirmDeleteAssessment}
              >
                Delete
              </button>
              <button
                className="btn btn-outline"
                style={{
                  margin: 0,
                  padding: "10px 20px",
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
                onClick={() => setDeleteAssessmentId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
