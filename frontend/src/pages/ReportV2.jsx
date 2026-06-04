import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getReportV2, getCurrentUser } from "../api";
import { useToast } from "../components/Toast";
import CurrencySelector from "../components/CurrencySelector";
import { formatCurrency, getDefaultCurrencyForRegion } from "../utils/currencyUtils";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";


function RiskRadar({ data }) {
  const width = 460;
  const height = 320;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 80;
  const domains = data || [];
  const angleStep = (Math.PI * 2) / Math.max(domains.length, 3);

  const axisLines = [0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => {
    const points = domains
      .map((_, idx) => {
        const x = centerX + radius * scale * Math.cos(idx * angleStep - Math.PI / 2);
        const y = centerY + radius * scale * Math.sin(idx * angleStep - Math.PI / 2);
        return `${x},${y}`;
      })
      .join(" ");
    return <polygon key={i} points={points} fill="none" stroke="#f1f5f9" strokeWidth="1" />;
  });

  const dataPoints = domains
    .map((d, idx) => {
      const scale = (d.score || 0) / 100;
      const x = centerX + radius * scale * Math.cos(idx * angleStep - Math.PI / 2);
      const y = centerY + radius * scale * Math.sin(idx * angleStep - Math.PI / 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", margin: "0 auto" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: `${width}px` }}>
        <defs>
          <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
          </radialGradient>
        </defs>
        {axisLines}
        {domains.map((d, idx) => {
          const cos = Math.cos(idx * angleStep - Math.PI / 2);
          const sin = Math.sin(idx * angleStep - Math.PI / 2);
          
          const labelRadius = radius + 15;
          const x = centerX + labelRadius * cos;
          const y = centerY + labelRadius * sin;
          
          let textAnchor = "middle";
          let dx = 0;
          let dy = 4;

          if (cos > 0.1) {
            textAnchor = "start";
            dx = 6;
          } else if (cos < -0.1) {
            textAnchor = "end";
            dx = -6;
          }

          if (sin > 0.8) {
            dy = 10;
          } else if (sin < -0.8) {
            dy = -2;
          }

          return (
            <text 
              key={idx} 
              x={x + dx} 
              y={y + dy} 
              fontSize="9" 
              textAnchor={textAnchor} 
              fill="#94a3b8" 
              fontWeight="700"
            >
              {d.name}
            </text>
          );
        })}
        <polygon points={dataPoints} fill="url(#radarGrad)" stroke="var(--primary)" strokeWidth="3" strokeLinejoin="round" />
        {domains.map((d, idx) => {
          const scale = (d.score || 0) / 100;
          const x = centerX + radius * scale * Math.cos(idx * angleStep - Math.PI / 2);
          const y = centerY + radius * scale * Math.sin(idx * angleStep - Math.PI / 2);
          return <circle key={idx} cx={x} cy={y} r="4" fill="var(--primary)" stroke="#fff" strokeWidth="2" />;
        })}
      </svg>
    </div>
  );
}

const mapLikelihoodToNum = (val) => {
  if (!val) return 1;
  if (typeof val === 'number') return val;
  const s = String(val).toLowerCase();
  if (s.includes('almost') || s.includes('certain') || s.includes('5') || s.includes('critical')) return 5;
  if (s.includes('highly') || s.includes('high') || s.includes('4')) return 4;
  if (s.includes('moderate') || s.includes('medium') || s.includes('possible') || s.includes('3')) return 3;
  if (s.includes('unlikely') || s.includes('low') || s.includes('2')) return 2;
  if (s.includes('rare') || s.includes('minimal') || s.includes('1')) return 1;
  return 3;
};

const mapImpactToNum = (val) => {
  if (!val) return 1;
  if (typeof val === 'number') return val;
  const s = String(val).toLowerCase();
  if (s.includes('critical') || s.includes('very high') || s.includes('5')) return 5;
  if (s.includes('high') || s.includes('major') || s.includes('4')) return 4;
  if (s.includes('medium') || s.includes('moderate') || s.includes('3')) return 3;
  if (s.includes('low') || s.includes('minor') || s.includes('2')) return 2;
  if (s.includes('minimal') || s.includes('negligible') || s.includes('1')) return 1;
  return 3;
};

function RiskHeatMap({ risks }) {
  const levels = [5, 4, 3, 2, 1];
  const gridSize = 50;

  return (
    <div style={{ padding: 24, background: "#fff", borderRadius: 16, border: "1px solid #f1f5f9" }}>
      <div style={{ display: "grid", gridTemplateColumns: "40px repeat(5, 1fr)", gap: 6 }}>
        <div />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={`imp-${i}`} style={{ textAlign: "center", fontSize: "0.65rem", color: "#94a3b8", fontWeight: 800 }}>
            IMP {i}
          </div>
        ))}
        {levels.flatMap((likelihood) => [
          <div key={`lbl-${likelihood}`} style={{ alignSelf: "center", fontSize: "0.65rem", color: "#94a3b8", fontWeight: 800 }}>
            L{likelihood}
          </div>,
          ...[1, 2, 3, 4, 5].map((impact) => {
            const score = likelihood * impact;
            const color = score >= 15 ? "#fee2e2" : score >= 8 ? "#fef3c7" : "#f0fdf4";
            const dotColor = score >= 15 ? "#ef4444" : score >= 8 ? "#f59e0b" : "#22c55e";
            
            const count = (risks || []).filter((r) => {
              const rL = mapLikelihoodToNum(r.likelihood);
              const rI = mapImpactToNum(r.impact);
              return rL === likelihood && rI === impact;
            }).length;

            return (
              <div
                key={`cell-${likelihood}-${impact}`}
                style={{
                  height: gridSize,
                  background: color,
                  border: "1px solid #fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  borderRadius: 6,
                }}
              >
                {count > 0 && (
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      background: dotColor,
                      borderRadius: "50%",
                      color: "#fff",
                      fontSize: "0.8rem",
                      fontWeight: "900",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                      border: "2px solid #fff",
                    }}
                  >
                    {count}
                  </div>
                )}
              </div>
            );
          })
        ])}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.65rem", color: "#64748b" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "#f0fdf4" }} /> Low Risk
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.65rem", color: "#64748b" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "#fef3c7" }} /> Medium Risk
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.65rem", color: "#64748b" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "#fee2e2" }} /> High/Critical
        </div>
      </div>
    </div>
  );
}

export default function ReportV2() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const user = getCurrentUser();
  const username = user?.email ? user.email.split("@")[0] : "user";
  const roleLabel = (user?.role || "TEAM MEMBER").replace(/_/g, " ").toUpperCase();
  const isTeamMember = user?.role === 'team_member';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const assessmentId = id || sessionStorage.getItem("assessmentId");
        if (!assessmentId || assessmentId === "undefined") {
          throw new Error("Assessment ID not found. Please complete the assessment again.");
        }
        const json = await getReportV2(assessmentId);
        setData(json);

        // Set default currency
        if (json.insurance_readiness?.cyber_insurance_recommendation?.default_currency) {
          setSelectedCurrency(json.insurance_readiness.cyber_insurance_recommendation.default_currency);
        }
      } catch (err) {
        setError(err.message);
        toast.addToast(err.message || "Failed to load report", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id, toast]);

  if (loading) {
    return (
      <div className="page" style={{ background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div className="loader" style={{ margin: "0 auto 20px" }}></div>
          <h1 style={{ color: "#1e293b", fontSize: "1.5rem" }}>Architecting CISO Report...</h1>
          <p style={{ color: "#64748b" }}>Synthesizing compliance data and calculating risk vectors.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page" style={{ background: "#f8fafc" }}>
        <div className="card" style={{ maxWidth: 500, textAlign: "center", borderTop: "4px solid #ef4444" }}>
          <h1 style={{ color: "#ef4444", marginBottom: 16 }}>Assessment Error</h1>
          <p style={{ color: "#64748b", marginBottom: 24 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate("/start")}>
            Restart Assessment
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page" style={{ background: "#f8fafc" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <h1>No Report Data</h1>
          <p>Could not generate report. Please try again.</p>
          <button className="btn btn-primary" onClick={() => navigate("/start")}>
            Go to Start
          </button>
        </div>
      </div>
    );
  }

  const gap_analysis = data.gap_analysis || {};
  // Handle different recommendation field names from backend (recommendations vs remediation_roadmap)
  const recommendations = data.recommendations || data.remediation_roadmap || [];
  const financial_summary = data.financial_summary || null;
  // Support both FastAPI response (risk_register) and fallback (risk_analysis.risks)
  const risk_register = data.risk_register || data.risk_analysis?.risks || [];

  const executive_summary = data.executive_summary || "";
  const compliance_overview = data.compliance_overview || {};

  const uploaded_policies = data.uploaded_policies || [];
  const policy_hub_documents = data.policy_hub_documents || [];

  const sessionFormData = JSON.parse(sessionStorage.getItem("assessmentFormData") || "{}");
  const report_metadata = {
    ...data.report_metadata,
    organization: (data.report_metadata?.organization && data.report_metadata.organization !== "N/A") 
      ? data.report_metadata.organization 
      : (sessionFormData.orgName || "N/A"),
    framework: (data.report_metadata?.framework && data.report_metadata.framework !== "N/A") 
      ? data.report_metadata.framework 
      : (sessionStorage.getItem("compliance") || "N/A"),
    generated_at: data.report_metadata?.generated_at || new Date().toISOString(),
    scope: {
      industry: data.report_metadata?.scope?.industry || sessionFormData.industry || "N/A",
      region: data.report_metadata?.scope?.region || sessionFormData.region || "Global",
      ...data.report_metadata?.scope
    }
  };

  return (
    <div
      className="page"
      style={{
        background: "#f1f5f9",
        justifyContent: "flex-start",
        alignItems: "stretch",
        paddingTop: 0,
        paddingBottom: 80,
        paddingLeft: 0,
        paddingRight: 0,
        overflowY: "auto",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; }
          .report-container { width: 100% !important; max-width: none !important; box-shadow: none !important; border: none !important; margin: 0 !important; }
          .page-break { page-break-after: always; }
        }
        .report-container { background: white; width: 100%; max-width: 1050mm; margin: 0 auto; box-shadow: 0 20px 50px rgba(0,0,0,0.1); border-radius: 20px; overflow: hidden; }
        .section-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--primary); font-weight: 800; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
        .section-title::after { content: ""; flex: 1; height: 1px; background: #f1f5f9; }
        .data-card { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 16px; padding: 24px; }
      `}</style>

      {/* Unified Header */}
      <div 
        className="no-print"
        style={{
          width: "100%",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border-color)",
          padding: "16px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxSizing: "border-box",
          marginBottom: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            className="btn btn-back"
            style={{ marginBottom: 0, padding: "6px 12px", fontSize: "0.85rem", height: "auto" }}
            onClick={() => navigate(`/dashboard-v2/${id || sessionStorage.getItem("assessmentId")}`)}
          >
            ← Back
          </button>
          <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>
            <span style={{ color: "var(--text-main)", fontWeight: 900 }}>GRC tool</span>{" "}
            <span style={{ color: "var(--primary)" }}>Report</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sun size={16} color="#f59e0b" style={{ opacity: theme === "light" ? 1 : 0.4 }} />
            <button
              onClick={toggleTheme}
              style={{
                width: 38,
                height: 20,
                borderRadius: 10,
                backgroundColor: theme === "dark" ? "var(--primary)" : "#cbd5e1",
                border: "none",
                position: "relative",
                cursor: "pointer",
                padding: 0,
                transition: "background-color 0.2s",
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  backgroundColor: "#fff",
                  position: "absolute",
                  top: 3,
                  left: theme === "dark" ? 21 : 3,
                  transition: "left 0.2s",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              />
            </button>
            <Moon size={16} color="#a855f7" style={{ opacity: theme === "dark" ? 1 : 0.4 }} />
          </div>

          <div style={{ width: 1, height: 20, backgroundColor: "var(--border-color)" }} />

          <button
            className="btn btn-outline"
            style={{
              height: 32,
              padding: "0 12px",
              fontSize: "0.8rem",
              margin: 0,
              background: "var(--surface)",
              color: "var(--text-main)",
              border: "1px solid var(--border-color)",
              borderRadius: 6,
              width: "auto"
            }}
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>

          <div style={{ width: 1, height: 20, backgroundColor: "var(--border-color)" }} />

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Welcome, <strong style={{ color: "var(--text-main)" }}>{username}</strong>
            </span>
            <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div style={{ padding: "0 40px", width: "100%", boxSizing: "border-box" }}>
        {/* Secondary Actions Bar */}
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 800,
                padding: "4px 10px",
                borderRadius: 20,
                textTransform: "uppercase",
                background: `rgba(16, 185, 129, 0.15)`,
                color: "#10b981",
                border: `1px solid rgba(16, 185, 129, 0.3)`,
              }}
            >
              Completed
            </span>
            <span style={{ color: "var(--text-muted)", marginLeft: 16, fontSize: "0.95rem" }}>
              <strong>{report_metadata.organization || "Organization"}</strong> | {report_metadata.framework || "Framework"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <CurrencySelector selectedCurrency={selectedCurrency} onCurrencyChange={setSelectedCurrency} />
            <button
              className="btn btn-primary"
              style={{ width: "auto", padding: "0 24px", margin: 0, height: 36 }}
              onClick={() => window.print()}
            >
              Download PDF Report
            </button>
          </div>
        </div>

      <div className="report-container">
        {/* REPORT HEADER / COVER */}
        <div
          style={{
            padding: "60px 80px",
            background: "#0f172a",
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 400,
              height: 400,
              background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0) 70%)",
              borderRadius: "50%",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div
                  style={{
                    background: "var(--primary)",
                    color: "#fff",
                    display: "inline-block",
                    padding: "6px 14px",
                    borderRadius: 6,
                    fontSize: "0.7rem",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: 24,
                  }}
                >
                  Official GRC Audit
                </div>
                <h1 style={{ margin: 0, fontSize: "3rem", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, color: "#ffffff" }}>
                  Compliance & Risk
                  <br />
                  <span style={{ color: "var(--primary)" }}>Assessment Report</span>
                </h1>
                <div style={{ marginTop: 40, display: "flex", gap: 40, fontSize: "0.95rem", color: "#94a3b8" }}>
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        textTransform: "uppercase",
                        fontWeight: 800,
                        color: "#64748b",
                        marginBottom: 4,
                      }}
                    >
                      Organization
                    </div>
                    <div style={{ color: "#fff", fontWeight: 700 }}>{report_metadata.organization || "N/A"}</div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        textTransform: "uppercase",
                        fontWeight: 800,
                        color: "#64748b",
                        marginBottom: 4,
                      }}
                    >
                      Standard / Framework
                    </div>
                    <div style={{ color: "var(--primary)", fontWeight: 700 }}>{report_metadata.framework || "N/A"}</div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        textTransform: "uppercase",
                        fontWeight: 800,
                        color: "#64748b",
                        marginBottom: 4,
                      }}
                    >
                      Audit Cycle
                    </div>
                    <div style={{ color: "#fff", fontWeight: 700 }}>Q2 2026</div>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    width: 170,
                    height: 170,
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: "auto",
                  }}
                >
                  <div style={{ fontSize: "3rem", fontWeight: 900, color: "var(--primary)", lineHeight: 1 }}>
                    {Math.round(compliance_overview.overall_score || 0)}%
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      marginTop: 6,
                    }}
                  >
                    Maturity
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "60px 80px" }}>
          {/* SECTION 1: EXECUTIVE SUMMARY */}
          <section style={{ marginBottom: 60 }}>
            <div className="section-title">01. Executive Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 40 }}>
              <div>
                <p style={{ fontSize: "1.1rem", lineHeight: 1.7, color: "#334155", margin: 0 }}>{executive_summary}</p>
                <div style={{ marginTop: 30, display: "flex", gap: 16 }}>
                  <div
                    style={{
                      flex: 1,
                      padding: "20px",
                      background: "#f0fdf4",
                      borderRadius: 12,
                      border: "1px solid #dcfce7",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        color: "#166534",
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      Compliance Status
                    </div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#15803d" }}>
                      {compliance_overview.status || "N/A"}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      padding: "20px",
                      background: "#fef2f2",
                      borderRadius: 12,
                      border: "1px solid #fee2e2",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        color: "#991b1b",
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      Critical Gaps
                    </div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#dc2626" }}>
                      {(gap_analysis.summary?.missing_count || 0)} Findings
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="data-card"
                style={{ display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    color: "#64748b",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Assessment Metadata
                </div>
                <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Generated On</div>
                  <div style={{ fontWeight: 700 }}>
                    {report_metadata.generated_at ? new Date(report_metadata.generated_at).toLocaleString() : "N/A"}
                  </div>
                </div>
                <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Audit Scope</div>
                  <div style={{ fontWeight: 700 }}>{report_metadata.scope?.industry || "Full Organization"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Assessor</div>
                  <div style={{ fontWeight: 700 }}>GRC Copilot AI Engine</div>
                </div>
              </div>
            </div>
          </section>

          <div className="page-break" />

          {/* SECTION 2: VISUAL PROFILING */}
          <section style={{ marginBottom: 60 }}>
            <div className="section-title">02. Visual Risk & Compliance Profile</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              <div>
                <h3
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    color: "#1e293b",
                    marginBottom: 24,
                    textAlign: "center",
                  }}
                >
                  Domain Maturity Distribution
                </h3>
                <RiskRadar data={compliance_overview.domain_breakdown} />
                <p style={{ fontSize: "0.8rem", color: "#64748b", textAlign: "center", marginTop: 12, padding: "0 40px" }}>
                  The radar chart illustrates compliance levels across core domains. Outward vectors indicate higher
                  maturity.
                </p>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    color: "#1e293b",
                    marginBottom: 24,
                    textAlign: "center",
                  }}
                >
                  Inherent Threat Heatmap
                </h3>
                <RiskHeatMap risks={risk_register} />
                <p style={{ fontSize: "0.8rem", color: "#64748b", textAlign: "center", marginTop: 12, padding: "0 40px" }}>
                  Risk concentration by likelihood and impact. Red zones represent critical vulnerabilities requiring
                  immediate attention.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 3: RISK REGISTER */}
          <section style={{ marginBottom: 60 }}>
            <div className="section-title">03. Identified Risks & Vulnerabilities</div>
            <div style={{ overflow: "hidden", borderRadius: 16, border: "1px solid #e2e8f0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                    <th
                      style={{
                        padding: "16px 24px",
                        color: "#64748b",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                      }}
                    >
                      Risk ID / Title
                    </th>
                    <th
                      style={{
                        padding: "16px 24px",
                        color: "#64748b",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                      }}
                    >
                      Category
                    </th>
                    <th
                      style={{
                        padding: "16px 24px",
                        color: "#64748b",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        width: 120,
                      }}
                    >
                      Severity
                    </th>
                    <th
                      style={{
                        padding: "16px 24px",
                        color: "#64748b",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        fontSize: "0.7rem",
                        width: 80,
                        textAlign: "center",
                      }}
                    >
                      L x I
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {risk_register.length > 0 ? (
                    risk_register.map((risk, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "16px 24px" }}>
                          <div style={{ fontWeight: 700, color: "#1e293b" }}>{risk.title}</div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>ID: R-{1000 + i}</div>
                        </td>
                        <td style={{ padding: "16px 24px", color: "#475569" }}>{risk.category}</td>
                        <td style={{ padding: "16px 24px" }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: "0.65rem",
                              fontWeight: 900,
                              textTransform: "uppercase",
                              background: risk.severity === "critical" ? "#fef2f2" : risk.severity === "high" ? "#fff7ed" : "#f0fdf4",
                              color: risk.severity === "critical" ? "#ef4444" : risk.severity === "high" ? "#f59e0b" : "#22c55e",
                            }}
                          >
                            {risk.severity}
                          </span>
                        </td>
                        <td style={{ padding: "16px 24px", textAlign: "center", fontWeight: 800, color: "#1e293b" }}>
                          {risk.likelihood}×{risk.impact}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                        No significant risks identified in this cycle.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="page-break" />

          {/* SECTION 4: GAP ANALYSIS */}
          <section style={{ marginBottom: 60 }}>
            <div className="section-title">04. Detailed Control Gap Analysis</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 32 }}>
              <div style={{ padding: 24, background: "#f0fdf4", borderRadius: 16, border: "1px solid #dcfce7" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#16a34a", lineHeight: 1 }}>
                  {gap_analysis.summary?.compliant_count || 0}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    color: "#166534",
                    fontWeight: 800,
                    marginTop: 8,
                  }}
                >
                  Controls Compliant
                </div>
              </div>
              <div style={{ padding: 24, background: "#fffbeb", borderRadius: 16, border: "1px solid #fef3c7" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#d97706", lineHeight: 1 }}>
                  {gap_analysis.summary?.partial_count || 0}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    color: "#92400e",
                    fontWeight: 800,
                    marginTop: 8,
                  }}
                >
                  Partial Implementation
                </div>
              </div>
              <div style={{ padding: 24, background: "#fef2f2", borderRadius: 16, border: "1px solid #fee2e2" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#dc2626", lineHeight: 1 }}>
                  {gap_analysis.summary?.missing_count || 0}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    color: "#991b1b",
                    fontWeight: 800,
                    marginTop: 8,
                  }}
                >
                  Critical Gaps Found
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#1e293b", marginBottom: 16 }}>
              Primary Remediation Targets (Top 5)
            </h3>
            <div style={{ overflow: "hidden", borderRadius: 16, border: "1px solid #e2e8f0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                    <th style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 800 }}>
                      Ref
                    </th>
                    <th style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 800 }}>
                      Control Name
                    </th>
                    <th style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 800 }}>
                      Domain
                    </th>
                    <th
                      style={{
                        padding: "12px 20px",
                        borderBottom: "1px solid #e2e8f0",
                        color: "#64748b",
                        fontWeight: 800,
                        width: 140,
                      }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...(gap_analysis.missing || []), ...(gap_analysis.partial || [])].slice(0, 5).map((c, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 20px", fontWeight: 800, color: "#334155" }}>{c.ref}</td>
                      <td style={{ padding: "12px 20px", color: "#1e293b", fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: "12px 20px", color: "#64748b" }}>{c.domain}</td>
                      <td style={{ padding: "12px 20px" }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: "0.7rem",
                            textTransform: "uppercase",
                            color: c.score === 0 ? "#ef4444" : "#f59e0b",
                          }}
                        >
                          {c.score === 0 ? "NOT IMPLEMENTED" : `PARTIAL (${Math.round(c.score)}%)`}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(gap_analysis.missing || []).length === 0 && (gap_analysis.partial || []).length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>
                        No gaps found. All controls are compliant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="page-break" />

          {/* SECTION 05: GOVERNANCE & POLICY DOCUMENTS */}
          <section style={{ marginBottom: 60 }}>
            <div className="section-title">05. Governance & Policy Documents</div>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 24 }}>
              Documents uploaded during setup to establish organizational governance, analyzed by the AI engine for compliance alignment.
            </p>
            {policy_hub_documents.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {policy_hub_documents.map((doc, idx) => (
                  <div key={idx} style={{ padding: 24, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#1e293b" }}>{doc.policy_name}</h4>
                          <span style={{
                            fontSize: "0.6rem",
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontWeight: 900,
                            background: doc.policy_type === "compulsory" ? "#fee2e2" : "#f1f5f9",
                            color: doc.policy_type === "compulsory" ? "#ef4444" : "#475569"
                          }}>
                            {doc.policy_type?.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>
                          Uploaded on {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {doc.auto_fixed && (
                          <span style={{
                            fontSize: "0.65rem",
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontWeight: 800,
                            background: "#ecfdf5",
                            color: "#059669",
                            border: "1px solid #a7f3d0"
                          }}>
                            AI AUTO-FIXED
                          </span>
                        )}
                        <span style={{
                          fontSize: "0.8rem",
                          fontWeight: 800,
                          padding: "6px 12px",
                          borderRadius: 8,
                          background: doc.compliance_score >= 85 ? "#f0fdf4" : doc.compliance_score >= 60 ? "#fffbeb" : "#fef2f2",
                          color: doc.compliance_score >= 85 ? "#16a34a" : doc.compliance_score >= 60 ? "#d97706" : "#dc2626"
                        }}>
                          {doc.compliance_score}% Compliant
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      <div style={{ padding: 16, background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>
                          Identified Policy Gaps ({doc.gaps?.length || 0})
                        </div>
                        {doc.gaps && doc.gaps.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {doc.gaps.map((gap, gIdx) => (
                              <div key={gIdx} style={{ fontSize: "0.8rem" }}>
                                <div style={{ fontWeight: 700, color: "#334155", display: "flex", gap: 6 }}>
                                  <span style={{ color: gap.priority === "High" ? "#ef4444" : "#f59e0b" }}>●</span>
                                  {gap.title}
                                </div>
                                <div style={{ color: "#64748b", marginLeft: 14, marginTop: 2 }}>{gap.description}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic" }}>
                            No gaps found. The policy meets all framework requirements.
                          </div>
                        )}
                      </div>

                      <div style={{ padding: 16, background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>
                          AI Policy Recommendations
                        </div>
                        {doc.recommendations && doc.recommendations.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {doc.recommendations.map((rec, rIdx) => (
                              <div key={rIdx} style={{ fontSize: "0.8rem", color: "#334155", display: "flex", gap: 6 }}>
                                <span style={{ color: "#3b82f6" }}>💡</span>
                                <span>{rec}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic" }}>
                            No recommendations necessary.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: 16, border: "1px dashed #cbd5e1" }}>
                No governance documents were uploaded before the questionnaire.
              </div>
            )}
          </section>

          <div className="page-break" />

          {/* SECTION 06: AUDIT EVIDENCE RECORDS */}
          <section style={{ marginBottom: 60 }}>
            <div className="section-title">06. Control Audit Evidence Records</div>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 24 }}>
              Evidence files uploaded during the questionnaire phase to verify control implementation.
            </p>
            {uploaded_policies.length > 0 ? (
              <div style={{ overflow: "hidden", borderRadius: 16, border: "1px solid #e2e8f0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "12px 20px", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>File Name</th>
                      <th style={{ padding: "12px 20px", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Associated Control</th>
                      <th style={{ padding: "12px 20px", color: "#64748b", fontWeight: 800, textTransform: "uppercase" }}>Security Domain</th>
                      <th style={{ padding: "12px 20px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", width: 120 }}>File Size</th>
                      <th style={{ padding: "12px 20px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", width: 120 }}>Compliance Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploaded_policies.map((file, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 20px", fontWeight: 700, color: "#1e293b" }}>{file.filename}</td>
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{ fontWeight: 800, color: "#334155" }}>{file.control_id}</span>
                          <span style={{ marginLeft: 8, color: "#64748b" }}>- {file.control_name}</span>
                        </td>
                        <td style={{ padding: "12px 20px", color: "#475569" }}>{file.domain}</td>
                        <td style={{ padding: "12px 20px", color: "#64748b" }}>
                          {file.file_size ? (file.file_size / 1024 < 1024 ? `${(file.file_size / 1024).toFixed(1)} KB` : `${(file.file_size / (1024 * 1024)).toFixed(1)} MB`) : "N/A"}
                        </td>
                        <td style={{ padding: "12px 20px" }}>
                          <span style={{
                            fontWeight: 800,
                            padding: "4px 8px",
                            borderRadius: 4,
                            background: file.score >= 80 ? "#f0fdf4" : file.score >= 50 ? "#fffbeb" : "#fef2f2",
                            color: file.score >= 80 ? "#16a34a" : file.score >= 50 ? "#d97706" : "#dc2626",
                            fontSize: "0.75rem"
                          }}>
                            {file.score}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: 16, border: "1px dashed #cbd5e1" }}>
                No audit evidence files were uploaded during the questionnaire phase.
              </div>
            )}
          </section>

          <div className="page-break" />

          {/* SECTION 7: CYBER INSURANCE RECOMMENDATION */}
          <section style={{ marginBottom: 60 }}>
            <div className="section-title">07. Cyber Insurance Recommendation</div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div
                style={{
                  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                  color: "white",
                  padding: "60px 40px",
                  borderRadius: 24,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textAlign: "left"
                }}
              >
                <div>
                  <div style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#06b6d4", fontWeight: 900, marginBottom: 12 }}>
                    Recommended Coverage ({selectedCurrency})
                  </div>
                  <div style={{ fontSize: "4rem", fontWeight: 900, color: "#fff", lineHeight: 1 }}>
                    {formatCurrency(data.insurance_readiness?.cyber_insurance_recommendation?.amount_usd || 1000000, selectedCurrency)}
                  </div>
                  <div style={{ fontSize: "1.1rem", color: "#94a3b8", fontWeight: 600, marginTop: 12 }}>
                    Base: {formatCurrency(data.insurance_readiness?.cyber_insurance_recommendation?.amount_usd || 1000000, "USD")}
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "flex-end" }}>
                  <div style={{ background: "rgba(255,255,255,0.05)", padding: "20px 30px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", marginBottom: 8, fontWeight: 800 }}>Risk Profile</div>
                    <div style={{ 
                      fontSize: "1.5rem", fontWeight: 900, 
                      color: data.insurance_readiness?.cyber_insurance_recommendation?.risk_profile === "High" ? "#ef4444" : "#f59e0b"
                    }}>
                      {data.insurance_readiness?.cyber_insurance_recommendation?.risk_profile || "Moderate"}
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.05)", padding: "20px 30px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", marginBottom: 8, fontWeight: 800 }}>Recommendation</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#22c55e" }}>
                      {data.insurance_readiness?.cyber_insurance_recommendation?.is_recommended ? "REQUIRED" : "OPTIONAL"}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "40px", borderRadius: 24, border: "1px solid #e2e8f0" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", fontWeight: 800, color: "#1e293b" }}>Strategic Justification</h4>
                <p style={{ fontSize: "1rem", color: "#475569", lineHeight: 1.8, margin: 0 }}>
                  {data.insurance_readiness?.cyber_insurance_recommendation?.reasoning}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                <div className="data-card">
                  <h4 style={{ margin: "0 0 20px 0", fontSize: "0.9rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                    Recommended Coverage Conditions
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {(data.insurance_readiness?.cyber_insurance_recommendation?.conditions || []).map((condition, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ color: "#22c55e", fontSize: "1.2rem", lineHeight: 1 }}>✓</div>
                        <div style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.5 }}>{condition}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="data-card">
                  <h4 style={{ margin: "0 0 20px 0", fontSize: "0.9rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                    Technical Underwriting Readiness
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    {(data.insurance_readiness?.requirements || []).slice(0, 6).map((req, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f8fafc", borderRadius: 8 }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>{req.requirement}</span>
                        <span style={{ 
                          fontSize: "0.65rem", 
                          fontWeight: 900, 
                          padding: "4px 8px", 
                          borderRadius: 4,
                          background: req.status === "ready" ? "#f0fdf4" : req.status === "gap" ? "#fff7ed" : "#fef2f2",
                          color: req.status === "ready" ? "#22c55e" : req.status === "gap" ? "#f59e0b" : "#ef4444"
                        }}>
                          {req.status?.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 6: FINANCIALS */}

          <div className="page-break" />

          {/* SECTION 08: ROADMAP */}
          <section style={{ marginBottom: 60 }}>
            <div className="section-title">08. Prioritized Remediation Roadmap</div>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: 24 }}>
              Strategic action plan for mitigating identified risks. Actions are prioritized by impact on the overall
              security posture and compliance framework alignment.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {recommendations.length > 0 ? (
                recommendations.map((rec, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "24px 32px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "16px",
                      background: "#fff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      borderLeft: `6px solid ${
                        rec.remediation_priority === "Critical"
                          ? "#ef4444"
                          : rec.remediation_priority === "High"
                          ? "#f59e0b"
                          : "#3b82f6"
                      }`,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "0.65rem",
                            fontWeight: 900,
                            textTransform: "uppercase",
                            background:
                              rec.remediation_priority === "Critical"
                                ? "#fef2f2"
                                : rec.remediation_priority === "High"
                                ? "#fff7ed"
                                : "#f0f9ff",
                            color:
                              rec.remediation_priority === "Critical"
                                ? "#ef4444"
                                : rec.remediation_priority === "High"
                                ? "#f59e0b"
                                : "#3b82f6",
                          }}
                        >
                          {rec.remediation_priority} Priority
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>
                          {rec.impact_domain}
                        </span>
                      </div>
                      <h3 style={{ margin: "0 0 10px", fontSize: "1.1rem", fontWeight: 800, color: "#1e293b" }}>{rec.issue}</h3>
                      <div style={{ background: "#f8fafc", padding: 16, borderRadius: 10, border: "1px solid #f1f5f9" }}>
                        <div
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 900,
                            color: "var(--primary)",
                            textTransform: "uppercase",
                            marginBottom: 4,
                          }}
                        >
                          Recommended Action
                        </div>
                        <p style={{ fontSize: "0.95rem", color: "#334155", margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                          {rec.suggested_fix}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: 16 }}>
                  No recommendations needed. All controls are meeting compliance targets.
                </div>
              )}
            </div>
          </section>

          {/* SECTION 09: CONCLUSION */}
          <section
            style={{ background: "#0f172a", padding: 60, borderRadius: 24, color: "#fff", position: "relative", overflow: "hidden" }}
          >
            <div
              style={{
                position: "absolute",
                bottom: -50,
                left: -50,
                width: 200,
                height: 200,
                background: "rgba(59,130,246,0.1)",
                borderRadius: "50%",
              }}
            />
            <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff", marginBottom: 20 }}>09. Final Verdict & Conclusion</h2>
            <p style={{ fontSize: "1.2rem", lineHeight: 1.6, color: "#cbd5e1", fontStyle: "italic", marginBottom: 32 }}>
              "The current security posture of {report_metadata.organization || "the organization"} is officially rated as
              <strong style={{ color: "var(--primary)" }}>
                {" "}
                {(compliance_overview.overall_score || 0) > 75
                  ? "Satisfactory"
                  : (compliance_overview.overall_score || 0) > 50
                  ? "Moderate"
                  : "At-Risk"}
              </strong>
              . While core frameworks are in place, the {gap_analysis.summary?.missing_count || 0} critical gaps identified in
              this audit cycle represent significant liability under the {report_metadata.framework || "selected framework"}.
              Adherence to the roadmap in Section 08 is mandatory for risk mitigation."
            </p>
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.1)",
                paddingTop: 30,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    color: "#64748b",
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  Certified Audit Output
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>GRC Copilot Engine v2.4.0</div>
                <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  ID: {(report_metadata.assessment_id || "").substring(0, 8).toUpperCase()}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ height: 40, width: 120, borderBottom: "2px solid rgba(255,255,255,0.2)", marginBottom: 8 }} />
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 800 }}>Digital Signature Verified</div>
              </div>
            </div>
          </section>

          <div style={{ marginTop: 60, textAlign: "center", fontSize: "0.8rem", color: "#94a3b8" }}>
            End of Compliance Assessment Report — Generated by GRC Copilot for {report_metadata.organization || "the organization"}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
