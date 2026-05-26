import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { logout, getCurrentUser, listDashboards } from "../api";
import { useToast } from "../components/Toast";

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

  if (assessmentType === "gap_assessment") return "gap";
  if (assessmentType === "risk_assessment") return "risk";
  if (assessmentType === "vendor_assessment") return "vendor";
  if (assessmentType === "internal_audit") return "internal";

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
  const user = getCurrentUser();
  const [assessments, setAssessments] = useState([]);
  const [overlayInfo, setOverlayInfo] = useState(null);
  const [activeSummary, setActiveSummary] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await listDashboards();
      setAssessments(res.assessments || []);
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
      toast.addToast("Failed to load assessments", "error");
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
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
          background: "rgba(15, 23, 42, 0.9)",
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
            Assessments
          </h2>
        </div>

        <nav style={{ flex: 1 }}>
          {ASSESSMENT_INFO.map((item) => (
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
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
              <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{item.title}</span>
            </button>
          ))}
        </nav>

        <div style={{ padding: "24px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="btn btn-back" style={{ width: "100%", marginBottom: 0 }} onClick={() => navigate("/audit-logs")}>
            Audit Trail
          </button>
          <button className="btn btn-back" style={{ width: "100%", marginBottom: 0 }} onClick={() => navigate("/compliance-calendar")}>
            Calendar
          </button>
          <button className="btn btn-back" style={{ width: "100%", marginBottom: 0 }} onClick={handleLogout}>
            Logout
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
            background: "#fff",
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
              color: "var(--bg-color)",
            }}
          >
            GRC tool <span style={{ color: "var(--primary)", fontWeight: 400 }}>Dashboard</span>
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              onClick={fetchStats}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-color)",
                background: "#fff",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
            <div style={{ textAlign: "right", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Welcome, <strong>{user?.email?.split("@")[0]}</strong>
            </div>
          </div>
        </header>

        {/* CENTER CONTENT */}
        <div style={{ padding: "60px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ maxWidth: 1000, width: "100%", textAlign: "center" }}>
            <h2 style={{ fontSize: "2.5rem", marginBottom: 20, fontWeight: 800 }}>Audit Performance</h2>
            <p className="subtitle" style={{ marginBottom: 48 }}>
              A consolidated view of all your compliance activities and progress.
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
                  Global Health
                </div>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--text-main)" }}>
                  {globalHealth}%
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Average Compliance across {assessments.filter(a => a.compliance_score !== null && a.compliance_score !== undefined).length} scored assessments
                </div>
              </div>

              <div className="card" style={{ padding: 32, textAlign: "left", borderLeft: "6px solid #22c55e" }}>
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
                    <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#22c55e" }}>
                      {assessments.filter((a) => a.status === "complete").length}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: 8 }}>Done</span>
                  </div>
                  <div style={{ width: 1, height: 30, background: "var(--border-color)" }}></div>
                  <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => setActiveSummary({ status: 'pending', type: null })}>
                    <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f59e0b" }}>
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
                Assessment Type Scoreboards
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
                            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f59e0b" }}>{group.pending}</div>
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
        </div>

      </div>

      {/* OVERLAY MODAL */}
      {overlayInfo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.85)",
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
            background: "rgba(15, 23, 42, 0.85)",
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
                                                <button 
                                                    className="btn btn-primary" 
                                                    style={{ padding: '8px 16px', fontSize: '0.8rem', height: 'auto', width: 'auto', borderRadius: 8 }}
                                                    onClick={() => navigate(a.status === 'complete' ? `/dashboard-v2/${a.id}` : `/questionnaire-enhanced/${a.id}`)}
                                                >
                                                    {a.status === 'complete' ? 'View Results' : 'Continue'}
                                                </button>
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
    </div>
  );
}
