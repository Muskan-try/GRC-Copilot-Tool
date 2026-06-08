import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDashboardV2, getRisksV2, getGapsV2, getReportV2, getCurrentUser } from "../api";
import { useToast } from "../components/Toast";
import CurrencySelector from "../components/CurrencySelector";
import { formatCurrency, getDefaultCurrencyForRegion, CURRENCY_CONFIG } from "../utils/currencyUtils";
import { ShieldCheck, ShieldAlert, Shield, Clock, CheckCircle, AlertTriangle, Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";


function RiskRadar({ data }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const width = 560;
  const height = 320;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 85;
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
    return <polygon key={i} points={points} fill="none" stroke="var(--border-color)" strokeWidth="1" />;
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
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
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
          
          const x = centerX + (radius + 15) * cos;
          const y = centerY + (radius + 15) * sin;
          
          let textAnchor = "middle";
          let dx = 0;
          let dy = 4; // baseline adjustment

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
              fontSize="11" 
              textAnchor={textAnchor} 
              fill="var(--text-light)" 
              fontWeight="700"
            >
              {d.name}
            </text>
          );
        })}
        <polygon points={dataPoints} fill="url(#radarGrad)" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
        
        {/* Render dynamic tooltip at the center of the radar plot */}
        {hoveredPoint ? (
          <g>
            <rect x={centerX - 65} y={centerY - 22} width="130" height="44" rx="6" fill="#151d30" stroke="#3b82f6" strokeWidth="1" style={{ opacity: 0.95 }} />
            <text x={centerX} y={centerY - 6} fontSize="9" textAnchor="middle" fill="#94a3b8" fontWeight="700">
              {hoveredPoint.name?.substring(0, 22)}
            </text>
            <text x={centerX} y={centerY + 12} fontSize="12" textAnchor="middle" fill="#10b981" fontWeight="800">
              {Math.round(hoveredPoint.score || 0)}%
            </text>
          </g>
        ) : (
          <g style={{ pointerEvents: "none" }}>
            <text x={centerX} y={centerY + 4} fontSize="8" textAnchor="middle" fill="#475569" fontWeight="600" letterSpacing="0.05em">
              HOVER POINTS
            </text>
          </g>
        )}

        {domains.map((d, idx) => {
          const scale = (d.score || 0) / 100;
          const x = centerX + radius * scale * Math.cos(idx * angleStep - Math.PI / 2);
          const y = centerY + radius * scale * Math.sin(idx * angleStep - Math.PI / 2);
          const isHovered = hoveredPoint?.name === d.name;
          return (
            <circle 
              key={idx} 
              cx={x} 
              cy={y} 
              r={isHovered ? "6" : "4"} 
              fill="var(--primary)" 
              stroke="#fff" 
              strokeWidth={isHovered ? "2" : "1"} 
              style={{ cursor: "pointer", transition: "all 0.15s ease" }}
              onMouseEnter={() => setHoveredPoint(d)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <title>{d.name}: {Math.round(d.score || 0)}%</title>
            </circle>
          );
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
  const gridSize = 40;

  return (
    <div style={{ padding: 16, background: "rgba(2, 6, 23, 0.4)", borderRadius: 12, border: "1px solid #1e293b" }}>
      <div style={{ display: "grid", gridTemplateColumns: "25px repeat(5, 1fr)", gap: 3 }}>
        <div />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={`imp-${i}`} style={{ textAlign: "center", fontSize: "0.6rem", color: "var(--text-light)", fontWeight: 800 }}>
            IMP {i}
          </div>
        ))}
        {levels.flatMap((likelihood) => [
          <div key={`lbl-${likelihood}`} style={{ alignSelf: "center", fontSize: "0.6rem", color: "var(--text-light)", fontWeight: 800 }}>
            L{likelihood}
          </div>,
          ...[1, 2, 3, 4, 5].map((impact) => {
            const score = likelihood * impact;
            const color = score >= 15 ? "#fee2e2" : score >= 8 ? "#fef3c7" : "#f0fdf4";
            const dotColor = score >= 15 ? "#ef4444" : score >= 8 ? "#f59e0b" : "#22c55e";
            
            // Use robust mapping to handle string formats from LLM outputs cleanly
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
                  borderRadius: 4,
                  position: "relative",
                }}
              >
                {count > 0 && (
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      background: dotColor,
                      borderRadius: "50%",
                      color: "#fff",
                      fontSize: "0.75rem",
                      fontWeight: "800",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid #fff",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
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
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.6rem", color: "var(--text-muted)" }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "#f0fdf4" }} /> Low
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.6rem", color: "var(--text-muted)" }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "#fef3c7" }} /> Med
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.6rem", color: "var(--text-muted)" }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: "#fee2e2" }} /> High
        </div>
      </div>
    </div>
  );
}

export default function DashboardV2() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const user = getCurrentUser();
  const username = user?.email ? user.email.split("@")[0] : "user";
  const roleLabel = (user?.role || "TEAM MEMBER").replace(/_/g, " ").toUpperCase();

  const [dashboard, setDashboard] = useState(null);
  const [risks, setRisks] = useState([]);
  const [gaps, setGaps] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [expandedGaps, setExpandedGaps] = useState({});

  const cardStyle = {
    background: "#151D30",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
    minHeight: "180px",
    position: "relative",
    overflow: "hidden",
  };

  const smallCardStyle = {
    ...cardStyle,
    minHeight: "145px",
    padding: "16px 20px"
  };

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
        setGaps(gapData);
        setReport(reportData);

        // Prioritize risks from report for consistency
        const reportRisks = reportData?.risk_register || reportData?.risk_analysis?.risks;
        setRisks(reportRisks || riskData.risks || riskData || []);

        // Set default currency from region in org profile
        const sessionFormData = JSON.parse(sessionStorage.getItem("assessmentFormData") || "{}");
        const region = dbData.metadata?.region || dbData.metadata?.scope?.region || sessionFormData.region || "Global/Multi-region";
        let defaultCurrency = getDefaultCurrencyForRegion(region);
        
        // Ensure India frameworks correctly trigger INR default if region isn't explicitly set
        const framework = dbData.metadata?.framework || dbData.framework || sessionFormData.compliance || "";
        if (defaultCurrency === "USD" && framework.includes("India")) {
          defaultCurrency = "INR";
        }
        
        setSelectedCurrency(defaultCurrency);
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

  const toggleExpand = (ref) => {
    setExpandedGaps(prev => ({
      ...prev,
      [ref]: !prev[ref]
    }));
  };

  if (loading) {
    return (
      <div className="page" style={{ background: "var(--bg-color)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="loader" style={{ margin: "0 auto 20px" }}></div>
          <h1 style={{ color: "var(--text-main)", fontSize: "1.5rem" }}>Analyzing Assessment Results...</h1>
          <p style={{ color: "var(--text-muted)" }}>Loading dashboard data from the server</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isTeamLead = getCurrentUser()?.role === 'lead';
    return (
      <div className="page" style={{ background: "var(--bg-color)" }}>
        <div className="card" style={{ textAlign: "center", borderTop: "4px solid #ef4444" }}>
          <h1 style={{ color: "#ef4444", marginBottom: 16 }}>Dashboard Error</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>{error}</p>
          {!isTeamLead && (
            <button className="btn btn-primary" onClick={() => navigate("/start")} style={{ marginTop: 20 }}>
              Start New Audit
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!dashboard) {
    const isTeamLead = getCurrentUser()?.role === 'lead';
    return (
      <div className="page" style={{ background: "var(--bg-color)" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <h1>Dashboard Error</h1>
          <p>No dashboard data received.</p>
          <button className="btn btn-primary" onClick={() => navigate("/start")}>
            {isTeamLead ? "Back to Start" : "Go to Start"}
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboard.stats || {};
  const compliance_chart = dashboard.compliance_chart || {};
  const sessionFormData = JSON.parse(sessionStorage.getItem("assessmentFormData") || "{}");
  const metadata = {
    ...dashboard.metadata,
    organization: (dashboard.metadata?.organization && dashboard.metadata.organization !== "N/A") 
      ? dashboard.metadata.organization 
      : (sessionFormData.orgName || "Organization"),
    framework: (dashboard.metadata?.framework && dashboard.metadata.framework !== "N/A") 
      ? dashboard.metadata.framework 
      : (sessionStorage.getItem("compliance") || "Framework"),
  };
  const activity = dashboard.activity || [];
  const domain_progress = dashboard.domain_progress || [];
  const evidence_stats = dashboard.evidence_stats || {};

  const radarData = report?.compliance_overview?.domain_breakdown || compliance_chart.domain_scores || [];

  // Establish USD as the base currency engine
  let totalCostUsd = dashboard?.total_cost_usd || report?.financial_summary?.total_estimated_usd || report?.cost_summary?.total_usd || 0;
  if (!totalCostUsd && dashboard?.implementation_timeline) {
     totalCostUsd = (dashboard.implementation_timeline.short_term?.base_cost_usd || 0) +
                    (dashboard.implementation_timeline.mid_term?.base_cost_usd || 0) +
                    (dashboard.implementation_timeline.long_term?.base_cost_usd || 0);
  } else if (!totalCostUsd && report?.recommendations) {
     totalCostUsd = report.recommendations.reduce((sum, req) => sum + (req.base_cost_usd || 0), 0);
  } else if (!totalCostUsd && dashboard?.gap_chart) {
     // Dynamic fallback estimation based on gaps if report/costs are not explicitly generated yet
     const missingCount = dashboard.gap_chart.missing || 0;
     const partialCount = dashboard.gap_chart.partial || 0;
     // Missing controls typically require more effort/cost to implement than partial ones
     totalCostUsd = (missingCount * 800) + (partialCount * 350);
  }

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
        background: "var(--bg-color)",
        justifyContent: "flex-start",
        alignItems: "stretch",
        paddingTop: 0,
        paddingBottom: 60,
        paddingLeft: 0,
        paddingRight: 0,
        overflowY: "auto",
      }}
    >
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
            onClick={() => navigate("/start")}
          >
            ← Back
          </button>
          <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>
            <span style={{ color: "var(--text-main)", fontWeight: 900 }}>GRC tool</span>{" "}
            <span style={{ color: "var(--primary)" }}>Dashboard</span>
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

      <div style={{ maxWidth: "none", width: "100%", display: "flex", flexDirection: "column", gap: 32, padding: "0 40px", boxSizing: "border-box" }}>
        {/* Secondary Actions Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <span
              style={{
                fontSize: "0.8rem",
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
            <span style={{ color: "var(--text-muted)", marginLeft: 16, fontSize: "0.95rem" }}>
              <strong>{metadata.organization || "Organization"}</strong> | {metadata.framework || "Framework"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <CurrencySelector selectedCurrency={selectedCurrency} onCurrencyChange={setSelectedCurrency} />
            <button
              className="btn btn-primary"
              style={{ width: "auto", padding: "0 24px", margin: 0, height: 40 }}
              onClick={() => navigate(`/report-v2/${id || sessionStorage.getItem("assessmentId")}`)}
            >
              View Full Report
            </button>
          </div>
        </div>
        {/* TOP ROW: SCORES & KEY STATS */}
        <style>{`
          .kpi-container {
            display: grid;
            grid-template-columns: 450px 1fr;
            gap: 24px;
            width: 100%;
            align-items: stretch;
          }
          .kpi-grid-2x2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            width: 100%;
          }
          @media (max-width: 1024px) {
            .kpi-container {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 640px) {
            .kpi-grid-2x2 {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
        
        <div className="kpi-container">
          
          {/* Card 1: Compliance Score (Large Left Panel) */}
          <div style={{ ...cardStyle, minHeight: "310px", justifyContent: "center", gap: 16 }}>
            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Compliance Score
            </div>
            <div style={{ position: "relative", width: "200px", height: "200px", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 8 }}>
              <svg style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" stroke="#1e293b" strokeWidth="7" fill="transparent" />
                <circle cx="50" cy="50" r="38" stroke="#10b981" strokeWidth="7" fill="transparent"
                        strokeDasharray="238.8"
                        strokeDashoffset={238.8 - ((stats.compliance_percentage || 0) / 100) * 238.8}
                        style={{ filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))" }}
                        strokeLinecap="round" />
              </svg>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "2.8rem", fontWeight: 900, color: "#ffffff", fontFamily: "monospace" }}>
                {Math.round(stats.compliance_percentage || 0)}%
              </div>
            </div>
          </div>

          {/* 2x2 Grid for the other 4 cards */}
          <div className="kpi-grid-2x2">
            
            {/* Card 2: Risk Score */}
            {(() => {
              const riskProfile = dashboard.insurance_readiness?.cyber_insurance_recommendation?.risk_profile || 
                                  (stats.total_risks > 5 ? "High" : stats.total_risks > 2 ? "Medium" : "Low");
              const isHigh = riskProfile === "High";
              const isMid = riskProfile === "Medium";
              const barColor = isHigh ? "#ef4444" : isMid ? "#f59e0b" : "#10b981";
              return (
                <div style={smallCardStyle}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    Risk Score
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", flex: 1 }}>
                    <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>
                      {stats.total_risks || 0}
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "#1e293b", borderRadius: "9999px", overflow: "hidden", position: "relative", marginTop: 12 }}>
                      <div style={{ height: "100%", background: barColor, borderRadius: "9999px", width: `${Math.min(100, (stats.total_risks || 0) * 12 || 10)}%`, transition: "width 0.5s ease" }} />
                    </div>
                    <span style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 8, fontWeight: 700, textTransform: "uppercase" }}>Severity: {riskProfile}</span>
                  </div>
                </div>
              );
            })()}

            {/* Card 3: Maturity Level */}
            {(() => {
              const maturityVal = Math.round((stats.compliance_percentage || 0) / 20) || 1;
              return (
                <div style={smallCardStyle}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    Maturity Level
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", flex: 1 }}>
                    <span style={{ background: "rgba(30, 58, 138, 0.4)", color: "#60a5fa", fontWeight: 700, padding: "6px 16px", borderRadius: "9999px", fontSize: "0.95rem", border: "1px solid rgba(96, 165, 250, 0.2)" }}>
                      Level {maturityVal} / 5
                    </span>
                    <div style={{ display: "flex", gap: "8px", marginTop: 12 }}>
                      {[1, 2, 3, 4, 5].map((index) => (
                        <div key={index} style={{ width: "12px", height: "12px", borderRadius: "50%", background: index <= maturityVal ? "#2dd4bf" : "#334155", boxShadow: index <= maturityVal ? "0 0 8px #2dd4bf" : "none", transition: "all 0.3s ease" }} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Card 4: Total Est. Cost */}
            <div style={smallCardStyle}>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                Estimated Remediation Cost
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", flex: 1 }}>
                <div style={{ fontSize: "2.0rem", fontWeight: 900, color: "#ffffff", fontFamily: "monospace" }}>
                  {formatCurrency(totalCostUsd, selectedCurrency, true)}
                </div>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Allocated via Gaps
              </div>
            </div>

            {/* Card 5: Insurance Recommendation */}
            {(() => {
              const isHighPriority = dashboard.insurance_readiness?.cyber_insurance_recommendation?.risk_profile === "High";
              const Icon = isHighPriority ? ShieldAlert : ShieldCheck;
              const iconColor = isHighPriority ? "#ef4444" : "#10b981";
              return (
                <div style={smallCardStyle}>
                  <div style={{ position: "absolute", top: "12px", right: "12px" }}>
                    <Icon size={22} color={iconColor} />
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    Insurance Rec.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", flex: 1 }}>
                    <div style={{ fontSize: "2.0rem", fontWeight: 900, color: "#ffffff", fontFamily: "monospace" }}>
                      {formatCurrency(dashboard.insurance_readiness?.cyber_insurance_recommendation?.amount_usd || 1000000, selectedCurrency, true)}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Recommended Coverage
                  </div>
                </div>
              );
            })()}

          </div>
        </div>

        {/* TIER 2: ASYMMETRIC GRID ARCHITECTURE */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, width: "100%", marginTop: 12 }}>
          
          {/* Left Side: Cyber Insurance Recommendation Panel */}
          <div style={{ height: "100%", boxSizing: "border-box", background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(12px)", border: "1px solid #1e293b", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)" }}>
            <div style={{ borderBottom: "1px solid #1e293b", paddingBottom: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Shield size={26} color="#3b82f6" style={{ flexShrink: 0 }} />
                <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#ffffff", margin: 0, lineHeight: 1.2 }}>Cyber Insurance Recommendation</h3>
              </div>
              <p style={{ fontSize: "0.9rem", color: "#64748b", margin: "6px 0 0 38px" }}>Risk Assessment & Policy Coverage Profile</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: 20 }}>
              <div style={{ padding: "16px", background: "rgba(2, 6, 23, 0.4)", border: "1px solid #1e293b", borderRadius: "8px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Recommended Coverage</span>
                <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#ffffff", marginTop: 4, fontFamily: "monospace" }}>
                  {formatCurrency(dashboard.insurance_readiness?.cyber_insurance_recommendation?.amount_usd || 1000000, selectedCurrency)}
                </div>
              </div>
              <div style={{ padding: "16px", background: "rgba(2, 6, 23, 0.4)", border: "1px solid #1e293b", borderRadius: "8px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Risk Profile Rating</span>
                <div style={{ fontSize: "1.35rem", fontWeight: 800, color: dashboard.insurance_readiness?.cyber_insurance_recommendation?.risk_profile === "High" ? "#ef4444" : "#f59e0b", marginTop: 4 }}>
                  {dashboard.insurance_readiness?.cyber_insurance_recommendation?.risk_profile || "Moderate"}
                </div>
              </div>
              <div style={{ padding: "16px", background: "rgba(2, 6, 23, 0.4)", border: "1px solid #1e293b", borderRadius: "8px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Requirement Status</span>
                <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#10b981", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle size={18} /> REQUIRED
                </div>
              </div>
            </div>

            <div style={{ flex: 1, background: "#4189b2", border: "1px solid rgba(56, 189, 248, 0.5)", padding: "16px", borderRadius: "8px", marginBottom: 20 }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#7dd3fc", textTransform: "uppercase", display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>Recommendation Strategy</span>
              <p style={{ fontSize: "1.05rem", color: "#ffffff", lineHeight: 1.6, margin: 0 }}>
                {dashboard.insurance_readiness?.cyber_insurance_recommendation?.reasoning}
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 12 }}>Coverage Control Requirements</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                {(dashboard.insurance_readiness?.requirements || []).slice(0, 6).map((req, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "rgba(2, 6, 23, 0.2)", border: "1px solid rgba(30, 41, 59, 0.4)", borderRadius: "8px" }}>
                    <span style={{ fontSize: "1.0rem", color: "#e2e8f0", fontWeight: 500 }}>{req.requirement}</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, padding: "2px 8px", borderRadius: "4px", textTransform: "uppercase", background: req.status === "ready" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)", color: req.status === "ready" ? "#10b981" : "#f59e0b" }}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side: Stacked Sidebar Analytics (Domain Progress) */}
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(12px)", border: "1px solid #1e293b", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", flex: 1, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #1e293b", paddingBottom: 16 }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Domain Progress</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, justifyContent: "space-between" }}>
                {(domain_progress || []).map((dp, i) => {
                  const percent = dp.total > 0 ? ((dp.answered || 0) / dp.total) * 100 : 0;
                  const trackColor = percent > 70 ? "#10b981" : "linear-gradient(90deg, #3b82f6, #6366f1)";
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "1.0rem", fontWeight: 600, color: "#cbd5e1" }}>{dp.name}</span>
                        <span style={{ fontSize: "0.95rem", color: "#64748b", fontFamily: "monospace" }}>
                          {dp.answered || 0}/{dp.total || 0}
                        </span>
                      </div>
                      <div style={{ height: "8px", background: "#1e293b", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
                        <div style={{ height: "100%", background: trackColor, borderRadius: "4px", width: `${percent}%`, transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        {/* MIDDLE ROW: CHARTS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ ...cardStyle, maxWidth: "none", width: "100%", alignItems: "stretch", display: "block" }}>
            <h3 style={{ fontSize: "0.95rem", textTransform: "uppercase", color: "#94a3b8", marginBottom: 20 }}>
              Domain Performance Radar
            </h3>
            <RiskRadar data={radarData} />
          </div>
          <div style={{ ...cardStyle, maxWidth: "none", width: "100%", alignItems: "stretch", display: "block" }}>
            <h3 style={{ fontSize: "0.95rem", textTransform: "uppercase", color: "#94a3b8", marginBottom: 20 }}>
              Risk Matrix (Heat Map)
            </h3>
            <RiskHeatMap risks={risks} />
          </div>
        </div>

        {/* BOTTOM ROW: TABLES & LISTS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* IDENTIFIED RISKS */}
          <div style={{ ...cardStyle, maxWidth: "none", width: "100%", alignItems: "stretch", display: "block" }}>
            <h3 style={{ fontSize: "0.95rem", textTransform: "uppercase", color: "#94a3b8", marginBottom: 16 }}>
              Identified Risks
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {risks.slice(0, 8).map((risk, i) => (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    background: "rgba(2, 6, 23, 0.4)",
                    borderRadius: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid #1e293b"
                  }}
                >
                  <div style={{ fontSize: "1.0rem", fontWeight: 600, color: "#ffffff" }}>{risk.title}</div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      padding: "4px 8px",
                      borderRadius: 4,
                      textTransform: "uppercase",
                      background: risk.severity === "critical" ? "rgba(239, 68, 68, 0.15)" : risk.severity === "high" ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                      color: risk.severity === "critical" ? "#ef4444" : risk.severity === "high" ? "#f59e0b" : "#10b981",
                      border: `1px solid ${risk.severity === "critical" ? "rgba(239, 68, 68, 0.3)" : risk.severity === "high" ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)"}`
                    }}
                  >
                    {risk.severity}
                  </span>
                </div>
              ))}
              {risks.length === 0 && (
                <div style={{ textAlign: "center", color: "#64748b", padding: 20, gridColumn: "1/-1" }}>No risks identified</div>
              )}
            </div>
          </div>

          {/* GAP ANALYSIS SUMMARY */}
          <div style={{ ...cardStyle, maxWidth: "none", width: "100%", alignItems: "stretch", display: "block" }}>
            <h3 style={{ fontSize: "0.95rem", textTransform: "uppercase", color: "#94a3b8", marginBottom: 16 }}>
              Gap Analysis Table
            </h3>
            <div style={{ maxHeight: 600, overflowY: "auto", overflowX: "auto", width: "100%" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem", minWidth: 900 }}>
                <thead>
                  <tr style={{ textAlign: "center", borderBottom: "2px solid #334155" }}>
                    <th style={{ padding: "12px 16px", color: "#94a3b8", fontWeight: 700, borderLeft: "4px solid transparent" }}>Control</th>
                    <th style={{ padding: "12px 16px", color: "#94a3b8", fontWeight: 700 }}>Domain</th>
                    <th style={{ padding: "12px 16px", color: "#94a3b8", fontWeight: 700 }}>Priority</th>
                    <th style={{ padding: "12px 16px", color: "#94a3b8", fontWeight: 700 }}>Status</th>
                    <th style={{ padding: "12px 16px", color: "#94a3b8", fontWeight: 700 }}>Evidence Reference</th>
                    <th style={{ padding: "12px 16px", color: "#94a3b8", fontWeight: 700 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {gapMissing.map((gap, i) => {
                    const isExpanded = !!expandedGaps[gap.ref];
                    return (
                      <React.Fragment key={`missing-wrapper-${i}`}>
                        <tr 
                          onClick={() => toggleExpand(gap.ref)}
                          style={{ 
                            borderBottom: isExpanded ? "none" : "1px solid #1e293b", 
                            cursor: "pointer", 
                            background: isExpanded ? "rgba(30, 41, 59, 0.4)" : "transparent",
                            transition: "background 0.2s"
                          }}
                        >
                          <td style={{ padding: "16px", fontWeight: 700, color: "#ffffff", borderLeft: isExpanded ? "4px solid #3b82f6" : "4px solid transparent", transition: "border-left 0.15s ease", textAlign: "center" }}>
                            <div style={{ fontSize: "1.0rem" }}>{gap.ref}</div>
                            <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500, marginTop: 4 }}>{gap.name || "Standard Requirement"}</div>
                          </td>
                          <td style={{ padding: "16px", color: "#cbd5e1", textAlign: "center" }}>{gap.domain || "Security"}</td>
                          <td style={{ padding: "16px", textAlign: "center" }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#ef4444", background: "rgba(239, 68, 68, 0.15)", padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(239, 68, 68, 0.3)" }}>CRITICAL</span>
                          </td>
                          <td style={{ padding: "16px", color: "#ef4444", fontWeight: 800, textAlign: "center" }}>
                            MISSING
                          </td>
                          <td style={{ padding: "16px", textAlign: "center" }}>
                            {getCurrentUser()?.role === 'lead' ? (
                              <div 
                                style={{ 
                                  display: "flex", 
                                  alignItems: "center", 
                                  justifyContent: "center",
                                  gap: 6, 
                                  color: "#94a3b8", 
                                  fontSize: "0.85rem", 
                                  fontWeight: 600
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Clock size={14} />
                                <span>evidence-{gap.ref.toLowerCase()}.pdf</span>
                              </div>
                            ) : (
                              <div 
                                style={{ 
                                  display: "flex", 
                                  alignItems: "center", 
                                  justifyContent: "center",
                                  gap: 6, 
                                  color: "#3b82f6", 
                                  fontSize: "0.85rem", 
                                  cursor: "pointer",
                                  fontWeight: 600
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.addToast(`Upload evidence dialog for ${gap.ref}`, "info");
                                }}
                              >
                                <Clock size={14} />
                                <span>evidence-{gap.ref.toLowerCase()}.pdf</span>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "16px", textAlign: "center", color: "#3b82f6", fontWeight: 700, fontSize: "0.9rem" }}>
                            {isExpanded ? "Collapse ▲" : "Expand Details ▼"}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr style={{ background: "rgba(30, 41, 59, 0.4)", borderBottom: "1px solid #1e293b" }}>
                            <td colSpan={6} style={{ padding: "20px 24px 20px 20px", borderLeft: "4px solid #3b82f6" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, textAlign: "left" }}>
                                <div style={{ background: "rgba(2, 6, 23, 0.4)", border: "1px solid #1e293b", padding: "16px", borderRadius: "8px" }}>
                                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Current Gap / Finding</div>
                                  <div style={{ fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.5 }}>
                                    {gap.recommendation?.issue || `Control '${gap.ref}' is completely missing or lacks auditable evidence.`}
                                  </div>
                                </div>
                                <div style={{ background: "rgba(2, 6, 23, 0.4)", border: "1px solid #1e293b", padding: "16px", borderRadius: "8px" }}>
                                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Remediation Plan</div>
                                  <div style={{ fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.5 }}>
                                    {gap.recommendation?.suggested_fix || "Establish policies, deploy required systems, and compile logs for auditor review."}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {gapPartial.map((gap, i) => {
                    const isExpanded = !!expandedGaps[gap.ref];
                    return (
                      <React.Fragment key={`partial-wrapper-${i}`}>
                        <tr 
                          onClick={() => toggleExpand(gap.ref)}
                          style={{ 
                            borderBottom: isExpanded ? "none" : "1px solid #1e293b", 
                            cursor: "pointer", 
                            background: isExpanded ? "rgba(30, 41, 59, 0.4)" : "transparent",
                            transition: "background 0.2s"
                          }}
                        >
                          <td style={{ padding: "16px", fontWeight: 700, color: "#ffffff", borderLeft: isExpanded ? "4px solid #3b82f6" : "4px solid transparent", transition: "border-left 0.15s ease", textAlign: "center" }}>
                            <div style={{ fontSize: "1.0rem" }}>{gap.ref}</div>
                            <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500, marginTop: 4 }}>{gap.name || "Standard Requirement"}</div>
                          </td>
                          <td style={{ padding: "16px", color: "#cbd5e1", textAlign: "center" }}>{gap.domain || "Security"}</td>
                          <td style={{ padding: "16px", textAlign: "center" }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#f59e0b", background: "rgba(245, 158, 11, 0.15)", padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(245, 158, 11, 0.3)" }}>HIGH</span>
                          </td>
                          <td style={{ padding: "16px", color: "#f59e0b", fontWeight: 800, textAlign: "center" }}>
                            PARTIAL
                          </td>
                          <td style={{ padding: "16px", textAlign: "center" }}>
                            {getCurrentUser()?.role === 'lead' ? (
                              <div 
                                style={{ 
                                  display: "flex", 
                                  alignItems: "center", 
                                  justifyContent: "center",
                                  gap: 6, 
                                  color: "#94a3b8", 
                                  fontSize: "0.85rem", 
                                  fontWeight: 600
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Clock size={14} />
                                <span>evidence-{gap.ref.toLowerCase()}.pdf</span>
                              </div>
                            ) : (
                              <div 
                                style={{ 
                                  display: "flex", 
                                  alignItems: "center", 
                                  justifyContent: "center",
                                  gap: 6, 
                                  color: "#3b82f6", 
                                  fontSize: "0.85rem", 
                                  cursor: "pointer",
                                  fontWeight: 600
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toast.addToast(`Upload evidence dialog for ${gap.ref}`, "info");
                                }}
                              >
                                <Clock size={14} />
                                <span>evidence-{gap.ref.toLowerCase()}.pdf</span>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "16px", textAlign: "center", color: "#3b82f6", fontWeight: 700, fontSize: "0.9rem" }}>
                            {isExpanded ? "Collapse ▲" : "Expand Details ▼"}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr style={{ background: "rgba(30, 41, 59, 0.4)", borderBottom: "1px solid #1e293b" }}>
                            <td colSpan={6} style={{ padding: "20px 24px 20px 20px", borderLeft: "4px solid #3b82f6" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, textAlign: "left" }}>
                                <div style={{ background: "rgba(2, 6, 23, 0.4)", border: "1px solid #1e293b", padding: "16px", borderRadius: "8px" }}>
                                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Current Gap / Finding</div>
                                  <div style={{ fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.5 }}>
                                    {gap.recommendation?.issue || `Control '${gap.ref}' is only partially implemented (Gap Severity: Medium).`}
                                  </div>
                                </div>
                                <div style={{ background: "rgba(2, 6, 23, 0.4)", border: "1px solid #1e293b", padding: "16px", borderRadius: "8px" }}>
                                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>Remediation Plan</div>
                                  <div style={{ fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.5 }}>
                                    {gap.recommendation?.suggested_fix || "Enhance operational policies, and schedule quarterly reviews."}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {gapMissing.length === 0 && gapPartial.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
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
          <div style={{ ...cardStyle, maxWidth: "none", width: "100%", alignItems: "stretch", display: "block" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#94a3b8", marginBottom: 16 }}>
              Key Recommendations
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {gapRecommendations.map((rec, i) => (
                <div
                  key={i}
                  style={{
                    padding: 16,
                    background: "rgba(2, 6, 23, 0.4)",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    borderLeft: "4px solid #3b82f6",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 800, marginBottom: 4 }}>
                    {rec.recommendation?.impact_domain || rec.domain || "General"}
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
                    {rec.recommendation?.issue || `Gap in ${rec.ref}`}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
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
