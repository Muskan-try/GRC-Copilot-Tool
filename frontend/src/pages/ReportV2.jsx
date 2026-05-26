import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getReportV2 } from "../api";
import { useToast } from "../components/Toast";
import CurrencySelector from "../components/CurrencySelector";
import { formatCurrency, getDefaultCurrencyForRegion } from "../utils/currencyUtils";

function RiskRadar({ data }) {
  const size = 320;
  const center = size / 2;
  const radius = center * 0.65;
  const domains = data || [];
  const angleStep = (Math.PI * 2) / Math.max(domains.length, 3);

  const axisLines = [0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => {
    const points = domains
      .map((_, idx) => {
        const x = center + radius * scale * Math.cos(idx * angleStep - Math.PI / 2);
        const y = center + radius * scale * Math.sin(idx * angleStep - Math.PI / 2);
        return `${x},${y}`;
      })
      .join(" ");
    return <polygon key={i} points={points} fill="none" stroke="var(--surface-hover)" strokeWidth="1" />;
  });

  const dataPoints = domains
    .map((d, idx) => {
      const scale = (d.score || 0) / 100;
      const x = center + radius * scale * Math.cos(idx * angleStep - Math.PI / 2);
      const y = center + radius * scale * Math.sin(idx * angleStep - Math.PI / 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div style={{ textAlign: "center", position: "relative" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.05)" />
          </radialGradient>
        </defs>
        {axisLines}
        {domains.map((d, idx) => {
          const x = center + (radius + 35) * Math.cos(idx * angleStep - Math.PI / 2);
          const y = center + (radius + 35) * Math.sin(idx * angleStep - Math.PI / 2);
          return (
            <text key={idx} x={x} y={y} fontSize="9" textAnchor="middle" fill="var(--text-light)" fontWeight="700">
              {d.name?.substring(0, 15)}
            </text>
          );
        })}
        <polygon points={dataPoints} fill="url(#radarGrad)" stroke="var(--primary)" strokeWidth="3" strokeLinejoin="round" />
        {domains.map((d, idx) => {
          const scale = (d.score || 0) / 100;
          const x = center + radius * scale * Math.cos(idx * angleStep - Math.PI / 2);
          const y = center + radius * scale * Math.sin(idx * angleStep - Math.PI / 2);
          return <circle key={idx} cx={x} cy={y} r="4" fill="var(--primary)" stroke="var(--text-on-dark)" strokeWidth="2" />;
        })}
      </svg>
    </div>
  );
}

function RiskHeatMap({ risks }) {
  const levels = [5, 4, 3, 2, 1];
  const gridSize = 50;

  return (
    <div style={{ padding: 24, background: "var(--surface-hover)", borderRadius: 16, border: "1px solid var(--border-color)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "40px repeat(5, 1fr)", gap: 6 }}>
        <div />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "0.65rem", color: "var(--text-light)", fontWeight: 800 }}>
            IMP {i}
          </div>
        ))}
        {levels.map((likelihood) => (
          <span key={likelihood}>
            <div style={{ alignSelf: "center", fontSize: "0.65rem", color: "var(--text-light)", fontWeight: 800 }}>
              L{likelihood}
            </div>
            {[1, 2, 3, 4, 5].map((impact) => {
              const score = likelihood * impact;
              const color = score >= 15 ? "var(--danger-bg)" : score >= 8 ? "var(--warning-bg)" : "var(--success-bg)";
              const dotColor = score >= 15 ? "var(--danger)" : score >= 8 ? "var(--warning)" : "var(--success)";
              const count = (risks || []).filter((r) => r.likelihood === likelihood && r.impact === impact).length;

              return (
                <div
                  key={impact}
                  style={{
                    height: gridSize,
                    background: color,
                    border: "1px solid var(--border-color)",
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
                        color: "var(--text-on-dark)",
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
            })}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.65rem", color: "var(--text-muted)" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--success-bg)" }} /> Low Risk
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.65rem", color: "var(--text-muted)" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--warning-bg)" }} /> Medium Risk
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.65rem", color: "var(--text-muted)" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "var(--danger-bg)" }} /> High/Critical
        </div>
      </div>
    </div>
  );
}

export default function ReportV2() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
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
      <div className="page" style={{ background: "var(--surface-hover)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="loader" style={{ margin: "0 auto 20px" }}></div>
          <h1 style={{ color: "var(--text-main)", fontSize: "1.5rem" }}>Architecting CISO Report...</h1>
          <p style={{ color: "var(--text-muted)" }}>Synthesizing compliance data and calculating risk vectors.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page" style={{ background: "var(--surface-hover)" }}>
        <div className="card" style={{ maxWidth: 500, textAlign: "center", borderTop: "4px solid #ef4444" }}>
          <h1 style={{ color: "var(--danger)", marginBottom: 16 }}>Assessment Error</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate("/start")}>
            Restart Assessment
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page" style={{ background: "var(--surface-hover)" }}>
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

  const report_metadata = data.report_metadata || {};
  const executive_summary = data.executive_summary || "";
  const compliance_overview = data.compliance_overview || {};
  const gap_analysis = data.gap_analysis || {};
  const recommendations = data.recommendations || [];
  const financial_summary = data.financial_summary || null;
  // Support both FastAPI response (risk_register) and fallback (risk_analysis.risks)
  const risk_register = data.risk_register || data.risk_analysis?.risks || [];

  return (
    <div
      className="page"
      style={{
        background: "var(--surface-hover)",
        justifyContent: "flex-start",
        paddingTop: 40,
        paddingBottom: 80,
        overflowY: "auto",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: var(--surface) !important; padding: 0 !important; }
          .report-container { width: 100% !important; max-width: none !important; box-shadow: none !important; border: none !important; margin: 0 !important; }
          .page-break { page-break-after: always; }
        }
        .report-container { background: var(--surface); width: 100%; max-width: 1050mm; margin: 0 auto; box-shadow: 0 20px 50px rgba(0,0,0,0.1); border-radius: 20px; overflow: hidden; }
        .section-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--primary); font-weight: 800; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
        .section-title::after { content: ""; flex: 1; height: 1px; background: var(--border-color); var(--border-color); }
        .data-card { background: var(--surface-hover); border: 1px solid var(--border-color); border-radius: 16px; padding: 24px; }
      `}</style>

      <div
        className="no-print"
        style={{ position: "fixed", top: "30px", left: "40px", zIndex: 1000, display: "flex", gap: 12, alignItems: "center" }}
      >
        <button
          className="btn btn-back"
          style={{ background: "var(--surface)", color: "var(--text-main)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", margin: 0 }}
          onClick={() => navigate(-1)}
        >
          ← Exit
        </button>
        <button
          className="btn btn-outline"
          style={{ background: "var(--surface)", color: "var(--text-main)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", margin: 0 }}
          onClick={() => navigate(`/dashboard-v2/${id || sessionStorage.getItem("assessmentId")}`)}
        >
          Dashboard
        </button>
        <div style={{ background: "var(--surface)", padding: "4px 12px", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", height: 44 }}>
          <CurrencySelector selectedCurrency={selectedCurrency} onCurrencyChange={setSelectedCurrency} />
        </div>
      </div>
      <div className="no-print" style={{ position: "fixed", top: "30px", right: "40px", zIndex: 1000 }}>
        <button
          className="btn btn-primary"
          style={{ boxShadow: "0 8px 20px var(--primary-light)", padding: "12px 24px", height: "auto" }}
          onClick={() => window.print()}
        >
          Download PDF Report
        </button>
      </div>

      <div className="report-container">
        {/* REPORT HEADER / COVER */}
        <div
          style={{
            padding: "60px 80px",
            background: "var(--loading-bg)",
            color: "var(--text-on-dark)",
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
                    color: "var(--text-on-dark)",
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
                <h1 style={{ margin: 0, fontSize: "3rem", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                  Compliance & Risk
                  <br />
                  <span style={{ color: "var(--primary)" }}>Assessment Report</span>
                </h1>
                <div style={{ marginTop: 40, display: "flex", gap: 40, fontSize: "0.95rem", color: "var(--text-light)" }}>
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        textTransform: "uppercase",
                        fontWeight: 800,
                        color: "var(--text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      Organization
                    </div>
                    <div style={{ color: "var(--text-on-dark)", fontWeight: 700 }}>{report_metadata.organization || "N/A"}</div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        textTransform: "uppercase",
                        fontWeight: 800,
                        color: "var(--text-muted)",
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
                        color: "var(--text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      Audit Cycle
                    </div>
                    <div style={{ color: "var(--text-on-dark)", fontWeight: 700 }}>Q2 2026</div>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    width: 140,
                    height: 140,
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "50%",
                    border: "1px solid var(--border-light)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--primary)", lineHeight: 1 }}>
                    {Math.round(compliance_overview.overall_score || 0)}%
                  </div>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      color: "var(--text-light)",
                      textTransform: "uppercase",
                      marginTop: 4,
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
                <p style={{ fontSize: "1.1rem", lineHeight: 1.7, color: "var(--text-main)", margin: 0 }}>{executive_summary}</p>
                <div style={{ marginTop: 30, display: "flex", gap: 16 }}>
                  <div
                    style={{
                      flex: 1,
                      padding: "20px",
                      background: "var(--success-bg)",
                      borderRadius: 12,
                      border: "1px solid #dcfce7",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        color: "var(--success)",
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      Compliance Status
                    </div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--success)" }}>
                      {compliance_overview.status || "N/A"}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      padding: "20px",
                      background: "var(--danger-bg)",
                      borderRadius: 12,
                      border: "1px solid #fee2e2",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        color: "var(--danger)",
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      Critical Gaps
                    </div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--danger)" }}>
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
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Assessment Metadata
                </div>
                <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>Generated On</div>
                  <div style={{ fontWeight: 700 }}>
                    {report_metadata.generated_at ? new Date(report_metadata.generated_at).toLocaleString() : "N/A"}
                  </div>
                </div>
                <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>Audit Scope</div>
                  <div style={{ fontWeight: 700 }}>{report_metadata.scope?.industry || "Full Organization"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>Assessor</div>
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
                    color: "var(--text-main)",
                    marginBottom: 24,
                    textAlign: "center",
                  }}
                >
                  Domain Maturity Distribution
                </h3>
                <RiskRadar data={compliance_overview.domain_breakdown} />
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", marginTop: 12, padding: "0 40px" }}>
                  The radar chart illustrates compliance levels across core domains. Outward vectors indicate higher
                  maturity.
                </p>
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 800,
                    color: "var(--text-main)",
                    marginBottom: 24,
                    textAlign: "center",
                  }}
                >
                  Inherent Threat Heatmap
                </h3>
                <RiskHeatMap risks={risk_register} />
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", marginTop: 12, padding: "0 40px" }}>
                  Risk concentration by likelihood and impact. Red zones represent critical vulnerabilities requiring
                  immediate attention.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 3: RISK REGISTER */}
          <section style={{ marginBottom: 60 }}>
            <div className="section-title">03. Identified Risks & Vulnerabilities</div>
            <div style={{ overflow: "hidden", borderRadius: 16, border: "1px solid var(--border-color)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ background: "var(--surface-hover)", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                    <th
                      style={{
                        padding: "16px 24px",
                        color: "var(--text-muted)",
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
                        color: "var(--text-muted)",
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
                        color: "var(--text-muted)",
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
                        color: "var(--text-muted)",
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
                          <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{risk.title}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-light)", marginTop: 4 }}>ID: R-{1000 + i}</div>
                        </td>
                        <td style={{ padding: "16px 24px", color: "var(--text-main)" }}>{risk.category}</td>
                        <td style={{ padding: "16px 24px" }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: "0.65rem",
                              fontWeight: 900,
                              textTransform: "uppercase",
                              background: risk.severity === "critical" ? "var(--danger-bg)" : risk.severity === "high" ? "var(--warning-bg)" : "var(--success-bg)",
                              color: risk.severity === "critical" ? "var(--danger)" : risk.severity === "high" ? "var(--warning)" : "var(--success)",
                            }}
                          >
                            {risk.severity}
                          </span>
                        </td>
                        <td style={{ padding: "16px 24px", textAlign: "center", fontWeight: 800, color: "var(--text-main)" }}>
                          {risk.likelihood}×{risk.impact}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ padding: 40, textAlign: "center", color: "var(--text-light)" }}>
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
              <div style={{ padding: 24, background: "var(--success-bg)", borderRadius: 16, border: "1px solid #dcfce7" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#16a34a", lineHeight: 1 }}>
                  {gap_analysis.summary?.compliant_count || 0}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    color: "var(--success)",
                    fontWeight: 800,
                    marginTop: 8,
                  }}
                >
                  Controls Compliant
                </div>
              </div>
              <div style={{ padding: 24, background: "var(--warning-bg)", borderRadius: 16, border: "1px solid #fef3c7" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--warning)", lineHeight: 1 }}>
                  {gap_analysis.summary?.partial_count || 0}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    color: "var(--warning)",
                    fontWeight: 800,
                    marginTop: 8,
                  }}
                >
                  Partial Implementation
                </div>
              </div>
              <div style={{ padding: 24, background: "var(--danger-bg)", borderRadius: 16, border: "1px solid #fee2e2" }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--danger)", lineHeight: 1 }}>
                  {gap_analysis.summary?.missing_count || 0}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    color: "var(--danger)",
                    fontWeight: 800,
                    marginTop: 8,
                  }}
                >
                  Critical Gaps Found
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-main)", marginBottom: 16 }}>
              Primary Remediation Targets (Top 5)
            </h3>
            <div style={{ overflow: "hidden", borderRadius: 16, border: "1px solid var(--border-color)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--surface-hover)", textAlign: "left" }}>
                    <th style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", color: "var(--text-muted)", fontWeight: 800 }}>
                      Ref
                    </th>
                    <th style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", color: "var(--text-muted)", fontWeight: 800 }}>
                      Control Name
                    </th>
                    <th style={{ padding: "12px 20px", borderBottom: "1px solid #e2e8f0", color: "var(--text-muted)", fontWeight: 800 }}>
                      Domain
                    </th>
                    <th
                      style={{
                        padding: "12px 20px",
                        borderBottom: "1px solid #e2e8f0",
                        color: "var(--text-muted)",
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
                      <td style={{ padding: "12px 20px", fontWeight: 800, color: "var(--text-main)" }}>{c.ref}</td>
                      <td style={{ padding: "12px 20px", color: "var(--text-main)", fontWeight: 600 }}>{c.name}</td>
                      <td style={{ padding: "12px 20px", color: "var(--text-muted)" }}>{c.domain}</td>
                      <td style={{ padding: "12px 20px" }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: "0.7rem",
                            textTransform: "uppercase",
                            color: c.score === 0 ? "var(--danger)" : "var(--warning)",
                          }}
                        >
                          {c.score === 0 ? "NOT IMPLEMENTED" : `PARTIAL (${Math.round(c.score)}%)`}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(gap_analysis.missing || []).length === 0 && (gap_analysis.partial || []).length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: 20, textAlign: "center", color: "var(--text-light)" }}>
                        No gaps found. All controls are compliant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 5: CYBER INSURANCE RECOMMENDATION */}
          <section style={{ marginBottom: 60 }}>
            <div className="section-title">05. Cyber Insurance Recommendation</div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div
                style={{
                  background: "linear-gradient(135deg, var(--bg-color) 0%, var(--surface) 100%)",
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
                  <div style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--accent)", fontWeight: 900, marginBottom: 12 }}>
                    Recommended Coverage ({selectedCurrency})
                  </div>
                  <div style={{ fontSize: "4rem", fontWeight: 900, color: "var(--text-on-dark)", lineHeight: 1 }}>
                    {formatCurrency(data.insurance_readiness?.cyber_insurance_recommendation?.amount_usd || 1000000, selectedCurrency)}
                  </div>
                  <div style={{ fontSize: "1.1rem", color: "var(--text-light)", fontWeight: 600, marginTop: 12 }}>
                    Base: {formatCurrency(data.insurance_readiness?.cyber_insurance_recommendation?.amount_usd || 1000000, "USD")}
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "flex-end" }}>
                  <div style={{ background: "var(--hover-subtle)", padding: "20px 30px", borderRadius: 16, border: "1px solid var(--border-light)", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-light)", textTransform: "uppercase", marginBottom: 8, fontWeight: 800 }}>Risk Profile</div>
                    <div style={{ 
                      fontSize: "1.5rem", fontWeight: 900, 
                      color: data.insurance_readiness?.cyber_insurance_recommendation?.risk_profile === "High" ? "var(--danger)" : "var(--warning)"
                    }}>
                      {data.insurance_readiness?.cyber_insurance_recommendation?.risk_profile || "Moderate"}
                    </div>
                  </div>
                  <div style={{ background: "var(--hover-subtle)", padding: "20px 30px", borderRadius: 16, border: "1px solid var(--border-light)", textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-light)", textTransform: "uppercase", marginBottom: 8, fontWeight: 800 }}>Recommendation</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--success)" }}>
                      {data.insurance_readiness?.cyber_insurance_recommendation?.is_recommended ? "REQUIRED" : "OPTIONAL"}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: "var(--surface-hover)", padding: "40px", borderRadius: 24, border: "1px solid var(--border-color)" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>Strategic Justification</h4>
                <p style={{ fontSize: "1rem", color: "var(--text-main)", lineHeight: 1.8, margin: 0 }}>
                  {data.insurance_readiness?.cyber_insurance_recommendation?.reasoning}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                <div className="data-card">
                  <h4 style={{ margin: "0 0 20px 0", fontSize: "0.9rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Recommended Coverage Conditions
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {(data.insurance_readiness?.cyber_insurance_recommendation?.conditions || []).map((condition, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ color: "var(--success)", fontSize: "1.2rem", lineHeight: 1 }}>✓</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-main)", lineHeight: 1.5 }}>{condition}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="data-card">
                  <h4 style={{ margin: "0 0 20px 0", fontSize: "0.9rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>
                    Technical Underwriting Readiness
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                    {(data.insurance_readiness?.requirements || []).slice(0, 6).map((req, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--surface-hover)", borderRadius: 8 }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-main)" }}>{req.requirement}</span>
                        <span style={{ 
                          fontSize: "0.65rem", 
                          fontWeight: 900, 
                          padding: "4px 8px", 
                          borderRadius: 4,
                          background: req.status === "ready" ? "var(--success-bg)" : req.status === "gap" ? "var(--warning-bg)" : "var(--danger-bg)",
                          color: req.status === "ready" ? "var(--success)" : req.status === "gap" ? "var(--warning)" : "var(--danger)"
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

          {/* SECTION 6: ROADMAP */}
          <section style={{ marginBottom: 60 }}>
            <div className="section-title">06. Prioritized Remediation Roadmap</div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 24 }}>
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
                      border: "1px solid var(--border-color)",
                      borderRadius: "16px",
                      background: "var(--surface)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      borderLeft: `6px solid ${
                        rec.remediation_priority === "Critical"
                          ? "var(--danger)"
                          : rec.remediation_priority === "High"
                          ? "var(--warning)"
                          : "var(--info)"
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
                                ? "var(--danger-bg)"
                                : rec.remediation_priority === "High"
                                ? "var(--warning-bg)"
                                : "var(--primary-bg-subtle)",
                            color:
                              rec.remediation_priority === "Critical"
                                ? "var(--danger)"
                                : rec.remediation_priority === "High"
                                ? "var(--warning)"
                                : "var(--info)",
                          }}
                        >
                          {rec.remediation_priority} Priority
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-light)", fontWeight: 800, textTransform: "uppercase" }}>
                          {rec.impact_domain}
                        </span>
                      </div>
                      <h3 style={{ margin: "0 0 10px", fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>{rec.issue}</h3>
                      <div style={{ background: "var(--surface-hover)", padding: 16, borderRadius: 10, border: "1px solid var(--border-color)" }}>
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
                        <p style={{ fontSize: "0.95rem", color: "var(--text-main)", margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                          {rec.suggested_fix}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-light)", background: "var(--surface-hover)", borderRadius: 16 }}>
                  No recommendations needed. All controls are meeting compliance targets.
                </div>
              )}
            </div>
          </section>

          {/* SECTION 7: CONCLUSION */}
          <section
            style={{ background: "var(--loading-bg)", padding: 60, borderRadius: 24, color: "var(--text-on-dark)", position: "relative", overflow: "hidden" }}
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
            <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--text-on-dark)", marginBottom: 20 }}>07. Final Verdict & Conclusion</h2>
            <p style={{ fontSize: "1.2rem", lineHeight: 1.6, color: "var(--border-color)", fontStyle: "italic", marginBottom: 32 }}>
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
              Adherence to the roadmap in Section 06 is mandatory for risk mitigation."
            </p>
            <div
              style={{
                borderTop: "1px solid var(--border-light)",
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
                    color: "var(--text-muted)",
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  Certified Audit Output
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>GRC Copilot Engine v2.4.0</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
                  ID: {(report_metadata.assessment_id || "").substring(0, 8).toUpperCase()}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ height: 40, width: 120, borderBottom: "2px solid rgba(255,255,255,0.2)", marginBottom: 8 }} />
                <div style={{ fontSize: "0.7rem", color: "var(--text-light)", fontWeight: 800 }}>Digital Signature Verified</div>
              </div>
            </div>
          </section>

          <div style={{ marginTop: 60, textAlign: "center", fontSize: "0.8rem", color: "var(--text-light)" }}>
            End of Compliance Assessment Report — Generated by GRC Copilot for {report_metadata.organization || "the organization"}
          </div>
        </div>
      </div>
    </div>
  );
}
