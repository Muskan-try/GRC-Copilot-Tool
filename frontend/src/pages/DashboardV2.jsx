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
    return <polygon key={i} points={points} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
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
            <text key={idx} x={x} y={y} fontSize="8" textAnchor="middle" fill="#94a3b8" fontWeight="700">
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
    <div style={{ padding: 16, background: "#f8fafc", borderRadius: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "25px repeat(5, 1fr)", gap: 3 }}>
        <div />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "0.65rem", color: "#94a3b8" }}>
            {i}
          </div>
        ))}
        {levels.map((likelihood) => (
          <span key={likelihood}>
            <div style={{ alignSelf: "center", fontSize: "0.65rem", color: "#94a3b8" }}>{likelihood}</div>
            {[1, 2, 3, 4, 5].map((impact) => {
              const score = likelihood * impact;
              const color = score >= 15 ? "#fee2e2" : score >= 8 ? "#fef3c7" : "#f0fdf4";
              const dotColor = score >= 15 ? "#ef4444" : score >= 8 ? "#f59e0b" : "#22c55e";
              const count = (risks || []).filter((r) => r.likelihood === likelihood && r.impact === impact).length;

              return (
                <div
                  key={impact}
                  style={{
                    height: gridSize,
                    background: color,
                    border: "1px solid #fff",
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
                        color: "#fff",
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
      <div style={{ textAlign: "center", marginTop: 8, fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600 }}>
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
      <div className="page" style={{ background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div className="loader" style={{ margin: "0 auto 20px" }}></div>
          <h1 style={{ color: "#1e293b", fontSize: "1.5rem" }}>Analyzing Assessment Results...</h1>
          <p style={{ color: "#64748b" }}>Loading dashboard data from the server</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page" style={{ background: "#f8fafc" }}>
        <div className="card" style={{ textAlign: "center", borderTop: "4px solid #ef4444" }}>
          <h1 style={{ color: "#ef4444", marginBottom: 16 }}>Dashboard Error</h1>
          <p style={{ color: "#64748b", marginBottom: 24 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate("/start")} style={{ marginTop: 20 }}>
            Start New Audit
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="page" style={{ background: "#f8fafc" }}>
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
    compliance_assessment: "#22c55e",
    risk_assessment: "#ef4444",
    gap_assessment: "#0ea5e9",
    vendor_assessment: "#8b5cf6",
    internal_audit: "#06b6d4",
  };

  const gapMissing = gaps?.missing_controls || [];
  const gapPartial = gaps?.partially_implemented || [];
  const gapRecommendations = [...gapMissing, ...gapPartial].slice(0, 4);

  return (
    <div
      className="page"
      style={{
        background: "#f8fafc",
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
                <h1 style={{ color: "#1e293b", margin: 0, fontSize: "1.75rem" }}>Audit Dashboard</h1>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: 20,
                    textTransform: "uppercase",
                    background: `${typeColors[assessmentType] || "#64748b"}15`,
                    color: typeColors[assessmentType] || "#64748b",
                    border: `1px solid ${typeColors[assessmentType] || "#64748b"}40`,
                  }}
                >
                  {typeLabel}
                </span>
              </div>
              <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "0.9rem" }}>
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
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>
              Compliance Score
            </div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--primary)" }}>
              {Math.round(stats.compliance_percentage || 0)}%
            </div>
          </div>
          <div className="card" style={{ padding: 24, textAlign: "center", borderRadius: 12, maxWidth: "none" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>
              Risks
            </div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#ef4444" }}>{stats.total_risks || 0}</div>
          </div>
          <div className="card" style={{ padding: 24, textAlign: "center", borderRadius: 12, maxWidth: "none" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>
              Total Est. Cost
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0d9488" }}>
              {formatCurrency((report?.cost_summary?.total_estimated_inr || 0) / 83.5, selectedCurrency, true)}
            </div>
          </div>
          <div className="card" style={{ padding: 24, textAlign: "center", borderRadius: 12, maxWidth: "none" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>
              Maturity
            </div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#3b82f6" }}>
              {Math.round((stats.compliance_percentage || 0) / 20)}
            </div>
          </div>
          <div className="card" style={{ padding: 24, textAlign: "center", borderRadius: 12, maxWidth: "none" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>
              Insurance Rec.
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#06b6d4" }}>
              {formatCurrency(dashboard.insurance_readiness?.cyber_insurance_recommendation?.amount_usd || 1000000, selectedCurrency, true)}
            </div>
          </div>
        </div>

        {/* CYBER INSURANCE RECOMMENDATION */}
        <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
          <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", marginBottom: 20 }}>
            Cyber Insurance Recommendation
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "stretch", gap: 24 }}>
              <div style={{ flex: "0 0 320px", padding: 20, background: "#f0fdfa", borderRadius: 12, border: "1px solid #ccfbf1", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0d9488", marginBottom: 4, textTransform: "uppercase" }}>
                  Recommended Coverage ({selectedCurrency})
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f766e" }}>
                  {formatCurrency(dashboard.insurance_readiness?.cyber_insurance_recommendation?.amount_usd || 1000000, selectedCurrency)}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#0d9488", marginTop: 4, fontWeight: 600 }}>
                  Base Estimate: {formatCurrency(dashboard.insurance_readiness?.cyber_insurance_recommendation?.amount_usd || 1000000, "USD")}
                </div>
              </div>
              
              <div style={{ flex: 1, background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>Recommendation Strategy</div>
                <p style={{ fontSize: "0.85rem", color: "#475569", margin: 0, lineHeight: 1.6 }}>
                  {dashboard.insurance_readiness?.cyber_insurance_recommendation?.reasoning}
                </p>
              </div>

              <div style={{ flex: "0 0 200px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ flex: 1, padding: "12px 16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>Risk Profile</div>
                  <div style={{ 
                    fontSize: "1.1rem", 
                    fontWeight: 800, 
                    color: dashboard.insurance_readiness?.cyber_insurance_recommendation?.risk_profile === "High" ? "#ef4444" : "#f59e0b"
                  }}>
                    {dashboard.insurance_readiness?.cyber_insurance_recommendation?.risk_profile || "Moderate"}
                  </div>
                </div>
                <div style={{ flex: 1, padding: "12px 16px", background: "#f0fdf4", borderRadius: 12, border: "1px solid #dcfce7", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#166534", textTransform: "uppercase", marginBottom: 4 }}>Status</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#15803d" }}>REQUIRED</div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {(dashboard.insurance_readiness?.requirements || []).slice(0, 5).map((req, i) => (
                <div key={i} style={{ padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1e293b" }}>{req.requirement}</div>
                  <span style={{ 
                    fontSize: "0.6rem", 
                    fontWeight: 800, 
                    padding: "3px 6px", 
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

        {/* ACTIVITY FEED + DOMAIN PROGRESS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Recent Activity */}
          <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", marginBottom: 16 }}>
              Recent Activity
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(activity || []).slice(0, 5).map((act, i) => (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    background: "#f8fafc",
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                      {act.control || act.domain || "Question"} answered
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>
                      Compliance:{" "}
                      <strong
                        style={{
                          color: act.is_na ? "#94a3b8" : act.answer_index === 0 ? "#22c55e" : act.answer_index === 1 ? "#f59e0b" : "#ef4444",
                        }}
                      >
                        {act.is_na ? "N/A" : ["Yes", "Partial", "No"][act.answer_index] || "N/A"}
                      </strong>{" "}
                      | Maturity: <strong>{act.maturity_score}/5</strong>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                    {act.submitted_at ? new Date(act.submitted_at).toLocaleTimeString() : "Just now"}
                  </span>
                </div>
              ))}
              {(!activity || activity.length === 0) && (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>No recent activity</div>
              )}
            </div>
          </div>

          {/* Domain Progress */}
          <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", marginBottom: 16 }}>
              Domain Progress
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(domain_progress || []).map((dp, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>{dp.name}</span>
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      {dp.answered || 0}/{dp.total || 0}
                    </span>
                  </div>
                  <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${dp.total > 0 ? ((dp.answered || 0) / dp.total) * 100 : 0}%`,
                        background: dp.critical_gaps > 0 ? "#ef4444" : "#22c55e",
                        borderRadius: 4,
                        transition: "width 0.5s ease",
                      }}
                    ></div>
                  </div>
                  {dp.critical_gaps > 0 && (
                    <div style={{ fontSize: "0.7rem", color: "#ef4444", marginTop: 2, fontWeight: 700 }}>
                      {dp.critical_gaps} critical gap{dp.critical_gaps > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              ))}
              {(!domain_progress || domain_progress.length === 0) && (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>No domain data yet</div>
              )}
            </div>
          </div>
        </div>

        {/* MIDDLE ROW: CHARTS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", marginBottom: 20 }}>
              Domain Performance Radar
            </h3>
            <RiskRadar data={compliance_chart.domain_scores} />
          </div>
          <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", marginBottom: 20 }}>
              Risk Matrix (Heat Map)
            </h3>
            <RiskHeatMap risks={risks} />
          </div>
        </div>

        {/* BOTTOM ROW: TABLES & LISTS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* IDENTIFIED RISKS */}
          <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", marginBottom: 16 }}>
              Identified Risks
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {risks.slice(0, 8).map((risk, i) => (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    background: "#f8fafc",
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid #f1f5f9"
                  }}
                >
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b" }}>{risk.title}</div>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      padding: "4px 8px",
                      borderRadius: 4,
                      textTransform: "uppercase",
                      background: risk.severity === "critical" ? "#fef2f2" : risk.severity === "high" ? "#fff7ed" : "#f0fdf4",
                      color: risk.severity === "critical" ? "#ef4444" : risk.severity === "high" ? "#f59e0b" : "#22c55e",
                    }}
                  >
                    {risk.severity}
                  </span>
                </div>
              ))}
              {risks.length === 0 && (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: 20, gridColumn: "1/-1" }}>No risks identified</div>
              )}
            </div>
          </div>

          {/* GAP ANALYSIS SUMMARY */}
          <div className="card" style={{ padding: 24, borderRadius: 12, maxWidth: "none" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", marginBottom: 16 }}>
              Gap Analysis Table
            </h3>
            <div style={{ maxHeight: 600, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid #f1f5f9" }}>
                    <th style={{ padding: "12px 8px", color: "#94a3b8" }}>Control ID</th>
                    <th style={{ padding: "12px 8px", color: "#94a3b8" }}>Domain</th>
                    <th style={{ padding: "12px 8px", color: "#94a3b8" }}>Priority</th>
                    <th style={{ padding: "12px 8px", color: "#94a3b8", textAlign: "right" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {gapMissing.map((gap, i) => (
                    <tr key={`missing-${i}`} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "12px 8px", fontWeight: 700, color: "#1e293b" }}>{gap.ref}</td>
                      <td style={{ padding: "12px 8px", color: "#64748b" }}>{gap.domain || "Security"}</td>
                      <td style={{ padding: "12px 8px" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#ef4444", background: "#fef2f2", padding: "2px 6px", borderRadius: 4 }}>CRITICAL</span>
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "right", color: "#ef4444", fontWeight: 800 }}>
                        MISSING
                      </td>
                    </tr>
                  ))}
                  {gapPartial.map((gap, i) => (
                    <tr key={`partial-${i}`} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "12px 8px", fontWeight: 700, color: "#1e293b" }}>{gap.ref}</td>
                      <td style={{ padding: "12px 8px", color: "#64748b" }}>{gap.domain || "Security"}</td>
                      <td style={{ padding: "12px 8px" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#f59e0b", background: "#fff7ed", padding: "2px 6px", borderRadius: 4 }}>HIGH</span>
                      </td>
                      <td style={{ padding: "12px 8px", textAlign: "right", color: "#f59e0b", fontWeight: 800 }}>
                        PARTIAL
                      </td>
                    </tr>
                  ))}
                  {gapMissing.length === 0 && gapPartial.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
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
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", marginBottom: 16 }}>
              Key Recommendations
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {gapRecommendations.map((rec, i) => (
                <div
                  key={i}
                  style={{
                    padding: 16,
                    background: "#f8fafc",
                    borderRadius: 8,
                    borderLeft: "3px solid var(--primary)",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 800, marginBottom: 4 }}>
                    {rec.recommendation?.impact_domain || rec.domain || "General"}
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
                    {rec.recommendation?.issue || `Gap in ${rec.ref}`}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
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
