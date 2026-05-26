import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDashboardV2, getRisksV2, getGapsV2, getReportV2 } from "../api";
import { useToast } from "../components/Toast";
import CurrencySelector from "../components/CurrencySelector";
import { formatCurrency, getDefaultCurrencyForRegion, CURRENCY_CONFIG } from "../utils/currencyUtils";

function RiskRadar({ data }) {
  const size = 260;
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
    return <polygon key={i} points={points} fill="none" stroke="var(--border-color)" strokeWidth="1" />;
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
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {axisLines}
        {domains.map((d, idx) => {
          const x = center + (radius + 15) * Math.cos(idx * angleStep - Math.PI / 2);
          const y = center + (radius + 15) * Math.sin(idx * angleStep - Math.PI / 2);
          return (
            <text key={idx} x={x} y={y} fontSize="8" textAnchor="middle" fill="var(--text-light)" fontWeight="700">
              {d.name?.substring(0, 10)}
            </text>
          );
        })}
        <polygon points={dataPoints} fill="rgba(59, 130, 246, 0.15)" stroke="var(--primary)" strokeWidth="2" />
      </svg>
    </div>
  );
}

function RiskHeatMap({ risks }) {
  const levels = [5, 4, 3, 2, 1];
  const gridSize = 40;

  return (
    <div style={{ padding: 16, background: "var(--surface-hover)", borderRadius: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "25px repeat(5, 1fr)", gap: 3 }}>
        <div />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "0.65rem", color: "var(--text-light)" }}>
            {i}
          </div>
        ))}
        {levels.map((likelihood) => (
          <span key={likelihood}>
            <div style={{ alignSelf: "center", fontSize: "0.65rem", color: "var(--text-light)" }}>{likelihood}</div>
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
                    borderRadius: 4,
                  }}
                >
                  {count > 0 && (
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        background: dotColor,
                        borderRadius: "50%",
                        color: "var(--text-on-dark)",
                        fontSize: "0.75rem",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
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
      <div style={{ textAlign: "center", marginTop: 8, fontSize: "0.7rem", color: "var(--text-light)", fontWeight: 600 }}>
        Risk Heatmap
      </div>
    </div>
  );
}

export default function DashboardV2() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [dashboard, setDashboard] = useState(null);
  const [risks, setRisks] = useState([]);
  const [gaps, setGaps] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const assessmentId = id || sessionStorage.getItem("assessmentId");
        if (!assessmentId || assessmentId === "undefined") {
          throw new Error("Assessment ID not found. Please start an assessment.");
        }

        const [dbData, riskData, gapData, reportData] = await Promise.all([
          getDashboardV2(assessmentId),
          getRisksV2(assessmentId),
          getGapsV2(assessmentId),
          getReportV2(assessmentId).catch(() => null),
        ]);
        setDashboard(dbData);
        setRisks(riskData.risks || riskData || []);
        setGaps(gapData);
        setReport(reportData);

        // Set default currency from backend
        if (dbData.insurance_readiness?.cyber_insurance_recommendation?.default_currency) {
          setSelectedCurrency(dbData.insurance_readiness.cyber_insurance_recommendation.default_currency);
        }
      } catch (err) {
        console.error("Dashboard load failed:", err);
        setError(err.message);
        toast.addToast(err.message || "Failed to load dashboard", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, toast]);

  if (loading) {
    return (
      <div className="page" style={{ background: "var(--surface-hover)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="loader" style={{ margin: "0 auto 20px" }}></div>
          <h1 style={{ color: "var(--text-main)", fontSize: "1.5rem" }}>Analyzing Assessment Results...</h1>
          <p style={{ color: "var(--text-muted)" }}>Loading dashboard data from the server</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page" style={{ background: "var(--surface-hover)" }}>
        <div className="card" style={{ textAlign: "center", borderTop: "4px solid #ef4444" }}>
          <h1 style={{ color: "var(--danger)", marginBottom: 16 }}>Dashboard Error</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate("/start")} style={{ marginTop: 20 }}>
            Start New Audit
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="page" style={{ background: "var(--surface-hover)" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <h1>Dashboard Error</h1>
          <p>No dashboard data received.</p>
          <button className="btn btn-primary" onClick={() => navigate("/start")}>
            Go to Start
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboard.stats || {};
  const compliance_chart = dashboard.compliance_chart || {};
  const metadata = dashboard.metadata || {};
  const activity = dashboard.activity || [];
  const domain_progress = dashboard.domain_progress || [];
  const evidence_stats = dashboard.evidence_stats || {};

  const assessmentType = metadata.assessment_type || "compliance_assessment";
  const typeLabel = assessmentType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const typeColors = {
    compliance_assessment: "var(--success)",
    risk_assessment: "var(--danger)",
    gap_assessment: "var(--primary)",
    vendor_assessment: "var(--primary)",
    internal_audit: "var(--accent)",
  };

  const gapMissing = gaps?.missing_controls || [];
  const gapPartial = gaps?.partially_implemented || [];
  const gapRecommendations = [...gapMissing, ...gapPartial].slice(0, 4);

  return (
    <div
      className="page"
      style={{
        background: "var(--surface-hover)",
        justifyContent: "flex-start",
        paddingTop: 30,
        paddingBottom: 60,
        overflowY: "auto",
      }}
    >
      <div className="page-header wide" style={{ maxWidth: 1200, width: "96%", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <button
              className="btn btn-back"
              style={{ marginBottom: 0, padding: "8px 16px", fontSize: "0.85rem" }}
              onClick={() => navigate("/start")}
            >
              Back
            </button>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <h1 style={{ color: "var(--text-main)", margin: 0, fontSize: "1.75rem" }}>Audit Dashboard</h1>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: 20,
                    textTransform: "uppercase",
                    background: `${typeColors[assessmentType] || "var(--text-muted)"}15`,
                    color: typeColors[assessmentType] || "var(--text-muted)",
                    border: `1px solid ${typeColors[assessmentType] || "var(--text-muted)"}40`,
                  }}
                >
                  {typeLabel}
                </span>
              </div>
              <p style={{ color: "var(--text-muted)", margin: "4px 0 0 0", fontSize: "0.9rem" }}>
                <strong>{metadata.organization || "Organization"}</strong> | {metadata.framework || "Framework"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <CurrencySelector selectedCurrency={selectedCurrency} onCurrencyChange={setSelectedCurrency} />
            <button
              className="btn btn-primary"
              style={{ width: "auto", padding: "0 32px", margin: 0 }}
              onClick={() => navigate(`/report-v2/${id || sessionStorage.getItem("assessmentId")}`)}
            >
              View Full Report
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, width: "96%", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* TOP ROW: SCORES & KEY STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 24 }}>
          <div className="card" style={{ padding: 24, textAlign: "center", borderRadius: 12, maxWidth: "none" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", marginBottom: 8 }}>
              Compliance Score
            </div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--primary)" }}>
              {Math.round(stats.compliance_percentage || 0)}%
            </div>
          </div>
          <div className="card" style={{ padding: 24, textAlign: "center", borderRadius: 12, maxWidth: "none" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", marginBottom: 8 }}>
              Risks
            </div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--danger)" }}>{stats.total_risks || 0}</div>
          </div>
          <div className="card" style={{ padding: 24, textAlign: "center", borderRadius: 12, maxWidth: "none" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", marginBottom: 8 }}>
              Total Est. Cost
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--success)" }}>
              {formatCurrency((report?.cost_summary?.total_estimated_inr || 0) / 83.5, selectedCurrency, true)}
            </div>
          </div>
          <div className="card" style={{ padding: 24, textAlign: "center", borderRadius: 12, maxWidth: "none" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", marginBottom: 8 }}>
              Maturity
            </div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--info)" }}>
              {Math.round((stats.compliance_percentage || 0) / 20)}
            </div>
          </div>
          <div className="card" style={{ padding: 24, textAlign: "center", borderRadius: 12, maxWidth: "none" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", marginBottom: 8 }}>
              Insurance Rec.
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--accent)" }}>
              {formatCurrency(dashboard.insurance_readiness?.cyber_insurance_recommendation?.amount_usd || 1000000, selectedCurrency, true)}
            </div>
          </div>
        </div>

        {/* CYBER INSURANCE RECOMMENDATION */}
        <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
          <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 20 }}>
            Cyber Insurance Recommendation
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "stretch", gap: 24 }}>
              <div style={{ flex: "0 0 320px", padding: 20, background: "var(--success-bg)", borderRadius: 12, border: "1px solid #ccfbf1", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--success)", marginBottom: 4, textTransform: "uppercase" }}>
                  Recommended Coverage ({selectedCurrency})
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--success)" }}>
                  {formatCurrency(dashboard.insurance_readiness?.cyber_insurance_recommendation?.amount_usd || 1000000, selectedCurrency)}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--success)", marginTop: 4, fontWeight: 600 }}>
                  Base Estimate: {formatCurrency(dashboard.insurance_readiness?.cyber_insurance_recommendation?.amount_usd || 1000000, "USD")}
                </div>
              </div>
              
              <div style={{ flex: 1, background: "var(--surface-hover)", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", marginBottom: 8 }}>Recommendation Strategy</div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-main)", margin: 0, lineHeight: 1.6 }}>
                  {dashboard.insurance_readiness?.cyber_insurance_recommendation?.reasoning}
                </p>
              </div>

              <div style={{ flex: "0 0 200px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ flex: 1, padding: "12px 16px", background: "var(--surface-hover)", borderRadius: 12, border: "1px solid #e2e8f0", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Risk Profile</div>
                  <div style={{ 
                    fontSize: "1.1rem", 
                    fontWeight: 800, 
                    color: dashboard.insurance_readiness?.cyber_insurance_recommendation?.risk_profile === "High" ? "var(--danger)" : "var(--warning)"
                  }}>
                    {dashboard.insurance_readiness?.cyber_insurance_recommendation?.risk_profile || "Moderate"}
                  </div>
                </div>
                <div style={{ flex: 1, padding: "12px 16px", background: "var(--success-bg)", borderRadius: 12, border: "1px solid #dcfce7", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--success)", textTransform: "uppercase", marginBottom: 4 }}>Status</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--success)" }}>REQUIRED</div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {(dashboard.insurance_readiness?.requirements || []).slice(0, 5).map((req, i) => (
                <div key={i} style={{ padding: 12, background: "var(--surface-hover)", borderRadius: 8, border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-main)" }}>{req.requirement}</div>
                  <span style={{ 
                    fontSize: "0.6rem", 
                    fontWeight: 800, 
                    padding: "3px 6px", 
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

        {/* ACTIVITY FEED + DOMAIN PROGRESS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Recent Activity */}
          <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
              Recent Activity
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(activity || []).slice(0, 5).map((act, i) => (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    background: "var(--surface-hover)",
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
                      {act.control || act.domain || "Question"} answered
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-light)", marginTop: 2 }}>
                      Compliance:{" "}
                      <strong
                        style={{
                          color: act.is_na ? "var(--text-light)" : act.answer_index === 0 ? "var(--success)" : act.answer_index === 1 ? "var(--warning)" : "var(--danger)",
                        }}
                      >
                        {act.is_na ? "N/A" : ["Yes", "Partial", "No"][act.answer_index] || "N/A"}
                      </strong>{" "}
                      | Maturity: <strong>{act.maturity_score}/5</strong>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-light)" }}>
                    {act.submitted_at ? new Date(act.submitted_at).toLocaleTimeString() : "Just now"}
                  </span>
                </div>
              ))}
              {(!activity || activity.length === 0) && (
                <div style={{ textAlign: "center", color: "var(--text-light)", padding: 20 }}>No recent activity</div>
              )}
            </div>
          </div>

          {/* Domain Progress */}
          <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
              Domain Progress
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(domain_progress || []).map((dp, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>{dp.name}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {dp.answered || 0}/{dp.total || 0}
                    </span>
                  </div>
                  <div style={{ height: 8, background: "var(--surface-hover)", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${dp.total > 0 ? ((dp.answered || 0) / dp.total) * 100 : 0}%`,
                        background: dp.critical_gaps > 0 ? "var(--danger)" : "var(--success)",
                        borderRadius: 4,
                        transition: "width 0.5s ease",
                      }}
                    ></div>
                  </div>
                  {dp.critical_gaps > 0 && (
                    <div style={{ fontSize: "0.7rem", color: "var(--danger)", marginTop: 2, fontWeight: 700 }}>
                      {dp.critical_gaps} critical gap{dp.critical_gaps > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              ))}
              {(!domain_progress || domain_progress.length === 0) && (
                <div style={{ textAlign: "center", color: "var(--text-light)", padding: 20 }}>No domain data yet</div>
              )}
            </div>
          </div>
        </div>

        {/* MIDDLE ROW: CHARTS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 20 }}>
              Domain Performance Radar
            </h3>
            <RiskRadar data={compliance_chart.domain_scores} />
          </div>
          <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 20 }}>
              Risk Matrix (Heat Map)
            </h3>
            <RiskHeatMap risks={risks} />
          </div>
        </div>

        {/* BOTTOM ROW: TABLES & LISTS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* IDENTIFIED RISKS */}
          <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
              Identified Risks
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {risks.slice(0, 8).map((risk, i) => (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    background: "var(--surface-hover)",
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid #f1f5f9"
                  }}
                >
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)" }}>{risk.title}</div>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      padding: "4px 8px",
                      borderRadius: 4,
                      textTransform: "uppercase",
                      background: risk.severity === "critical" ? "var(--danger-bg)" : risk.severity === "high" ? "var(--warning-bg)" : "var(--success-bg)",
                      color: risk.severity === "critical" ? "var(--danger)" : risk.severity === "high" ? "var(--warning)" : "var(--success)",
                    }}
                  >
                    {risk.severity}
                  </span>
                </div>
              ))}
              {risks.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--text-light)", padding: 20, gridColumn: "1/-1" }}>No risks identified</div>
              )}
            </div>
          </div>

          {/* GAP ANALYSIS SUMMARY */}
          <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
              Gap Analysis Table
            </h3>
            <div style={{ maxHeight: 600, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid #f1f5f9" }}>
                    <th style={{ padding: "12px 8px", color: "var(--text-light)" }}>Control ID</th>
                    <th style={{ padding: "12px 8px", color: "var(--text-light)" }}>Domain</th>
                    <th style={{ padding: "12px 8px", color: "var(--text-light)" }}>Priority</th>
                    <th style={{ padding: "12px 8px", color: "var(--text-light)", textAlign: "right" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {gapMissing.map((gap, i) => (
                    <tr key={`missing-${i}`} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "12px 8px", fontWeight: 700, color: "var(--text-main)" }}>{gap.ref}</td>
                      <td style={{ padding: "12px 8px", color: "var(--text-muted)" }}>{gap.domain || "Security"}</td>
                      <td style={{ padding: "12px 8px" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--danger)", background: "var(--danger-bg)", padding: "2px 6px", borderRadius: 4 }}>CRITICAL</span>
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "right", color: "var(--danger)", fontWeight: 800 }}>
                        MISSING
                      </td>
                    </tr>
                  ))}
                  {gapPartial.map((gap, i) => (
                    <tr key={`partial-${i}`} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "12px 8px", fontWeight: 700, color: "var(--text-main)" }}>{gap.ref}</td>
                      <td style={{ padding: "12px 8px", color: "var(--text-muted)" }}>{gap.domain || "Security"}</td>
                      <td style={{ padding: "12px 8px" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--warning)", background: "var(--warning-bg)", padding: "2px 6px", borderRadius: 4 }}>HIGH</span>
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "right", color: "var(--warning)", fontWeight: 800 }}>
                        PARTIAL
                      </td>
                    </tr>
                  ))}
                  {gapMissing.length === 0 && gapPartial.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: 40, textAlign: "center", color: "var(--text-light)" }}>
                        No gaps identified. All controls are compliant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RECOMMENDATIONS (WIDER) */}
        {gapRecommendations.length > 0 && (
          <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16 }}>
              Key Recommendations
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {gapRecommendations.map((rec, i) => (
                <div
                  key={i}
                  style={{
                    padding: 16,
                    background: "var(--surface-hover)",
                    borderRadius: 8,
                    borderLeft: "3px solid var(--primary)",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 800, marginBottom: 4 }}>
                    {rec.recommendation?.impact_domain || rec.domain || "General"}
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>
                    {rec.recommendation?.issue || `Gap in ${rec.ref}`}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {rec.recommendation?.suggested_fix || "Review and remediate this control."}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
