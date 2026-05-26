import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getSectionsForCompliance, lookupQuestion } from "../data/questionnaireConfig";

const CURRENCIES = [
  { code: "USD", symbol: "$", rate: 1, label: "United States (USD)" },
  { code: "INR", symbol: "₹", rate: 83.5, label: "India (INR)" },
  { code: "EUR", symbol: "€", rate: 0.92, label: "European Union (EUR)" },
  { code: "GBP", symbol: "£", rate: 0.79, label: "United Kingdom (GBP)" },
  { code: "AED", symbol: "dh ", rate: 3.67, label: "Middle East (AED)" },
  { code: "ZAR", symbol: "R ", rate: 18.8, label: "Africa (ZAR)" },
  { code: "KZT", symbol: "₸", rate: 450, label: "Central Asia (KZT)" },
];

/* ════════════════════════════════════════
   PROFESSIONAL CHART COMPONENTS
   ════════════════════════════════════════ */

function BarChart({ data }) {
  const height = 220;
  const barW = 45;
  const spacing = 25;
  const chartH = 150;
  const totalW = Math.max(600, data.length * (barW + spacing));
  
  return (
    <div style={{ margin: "30px 0", textAlign: "center", width: "100%" }}>
      <svg width="100%" height={height} viewBox={`0 0 ${totalW} ${height}`} preserveAspectRatio="xMidYMid meet">
        {data.map((d, i) => {
          const val = d.score || 0;
          const barH = (val / 100) * chartH;
          const x = i * (barW + spacing) + (totalW - data.length * (barW + spacing)) / 2;
          const y = chartH - barH + 30;
          const color = val >= 75 ? "#0f766e" : val >= 50 ? "#b45309" : "#be123c";
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} fill={color} rx="2" />
              <text x={x + barW / 2} y={y - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text-main)">{val}%</text>
              <text x={x + barW / 2} y={chartH + 55} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-muted)">{d.domain}</text>
            </g>
          );
        })}
        <line x1="0" y1={chartH + 30} x2={totalW} y2={chartH + 30} stroke="var(--text-light)" strokeWidth="2" />
      </svg>
    </div>
  );
}

function PieChart({ yes, partial, no }) {
  const total = yes + partial + no;
  const r = 50;
  const c = 2 * Math.PI * r;
  const slices = [
    { label: "Compliant", value: yes, color: "#0f766e" },
    { label: "Partial", value: partial, color: "#b45309" },
    { label: "Non-Compliant", value: no, color: "#be123c" }
  ];
  let currentOffset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "60px", margin: "40px 0" }}>
      <svg width="160" height="160" viewBox="0 0 120 120">
        {slices.map((slice, i) => {
          if (slice.value === 0) return null;
          const strokeDash = (slice.value / total) * c;
          const offset = currentOffset;
          currentOffset -= strokeDash;
          return (
            <circle key={i} cx="60" cy="60" r={r} fill="none" stroke={slice.color} strokeWidth="22" 
              strokeDasharray={`${strokeDash} ${c - strokeDash}`} strokeDashoffset={offset} transform="rotate(-90 60 60)" />
          );
        })}
      </svg>
      <div style={{ textAlign: "left" }}>
        {slices.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
            <div style={{ width: "14px", height: "14px", borderRadius: "3px", background: s.color }} />
            <span style={{ fontSize: "10pt", fontWeight: "700", color: "var(--text-main)" }}>{s.label}: {s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   COMPUTATION
   ════════════════════════════════════════ */

function computeReport(answers, compliance, formData) {
  const sections = getSectionsForCompliance(compliance);
  const values = Object.values(answers);
  const yes = values.filter(v => v === "Yes").length;
  const no = values.filter(v => v === "No").length;
  const partial = values.filter(v => v === "Partial").length;
  const score = (yes + no + partial) > 0 ? Math.round((yes / (yes + no + partial)) * 100) : 0;
  
  const domainScores = sections.map(s => {
    let dTotal = 0, dYes = 0;
    s.questions.forEach((_, i) => {
      const ans = answers[`${s.id}__${i}`];
      if (ans && ans !== "N/A") { dTotal++; if (ans === "Yes") dYes++; }
    });
    return { domain: s.title, score: dTotal > 0 ? Math.round((dYes / dTotal) * 100) : 0, description: s.description };
  });

  const gaps = Object.entries(answers).filter(([, v]) => v === "No" || v === "Partial").map(([key, response]) => {
    const meta = lookupQuestion(sections, key);
    return meta ? { ...meta, response } : null;
  }).filter(Boolean);

  let totalEstCostUsd = 0;
  domainScores.filter(d => d.score < 100).forEach(d => { totalEstCostUsd += d.score < 50 ? 8000 : 3500; });

  let cyberLevel = score < 30 ? "Required" : score < 60 ? "Recommended" : "Optional";
  let cyberCoverage = score < 30 ? "$500K - $1M+" : score < 60 ? "$100K - $500K" : "$50K - $100K";

  return { compliance, orgName: formData.orgName || "Organization", score, yes, no, partial, domainScores, gaps, totalEstCostUsd, cyberInsurance: { level: cyberLevel, coverage: cyberCoverage } };
}

/* ════════════════════════════════════════
   REPORT COMPONENT
   ════════════════════════════════════════ */

export default function Report() {
  const navigate = useNavigate();
  const compliance = sessionStorage.getItem("compliance") || "ISO/IEC 27001";
  const answers = JSON.parse(sessionStorage.getItem("answers") || "{}");
  const formData = JSON.parse(sessionStorage.getItem("assessmentFormData") || "{}");
  const currencyCode = sessionStorage.getItem("selectedCurrency") || "USD";
  const currency = useMemo(() => CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0], [currencyCode]);
  
  const data = useMemo(() => computeReport(answers, compliance, formData), [answers, compliance, formData]);

  return (
    <div style={{ background: "var(--surface-hover)", color: "var(--loading-bg)", fontFamily: "'Inter', sans-serif", padding: "40px 0" }}>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
          body { background: white !important; }
          .report-container { width: 100% !important; margin: 0 !important; box-shadow: none !important; }
        }
        .report-container { background: white; width: 210mm; min-height: 297mm; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
        .page-content { padding: 30mm 25mm; min-height: 297mm; position: relative; box-sizing: border-box; }
        h1 { font-size: 42pt; color: #0f172a; font-weight: 900; margin: 0; }
        h2 { font-size: 24pt; color: #0f172a; font-weight: 800; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-top: 40px; margin-bottom: 25px; }
        h3 { font-size: 16pt; color: #334155; font-weight: 700; margin-top: 30px; margin-bottom: 12px; }
        p { font-size: 11pt; color: #475569; line-height: 1.7; margin-bottom: 18px; }
        .accent-bar { width: 80px; height: 6px; background: #3b82f6; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 30px 0; font-size: 10pt; }
        th { background: #f1f5f9; color: #475569; font-weight: 800; padding: 12px; border: 1px solid #e2e8f0; text-align: left; }
        td { padding: 12px; border: 1px solid #e2e8f0; vertical-align: top; }
        .btn-container { position: fixed; top: 30px; right: 40px; display: flex; gap: 12px; z-index: 100; }
        .btn { padding: 10px 20px; cursor: pointer; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff; font-weight: 700; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .btn-primary { background: #0f172a; color: #fff; border: none; }
      `}</style>

      <div className="no-print" style={{ position: 'fixed', top: '30px', left: '40px', zIndex: 100 }}>
        <button className="btn" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
      </div>
      <div className="no-print" style={{ position: 'fixed', top: '30px', right: '40px', zIndex: 100 }}>
        <button className="btn btn-primary" onClick={() => window.print()}>Download Official PDF</button>
      </div>

      <div className="report-container">
        
        {/* PAGE 1: COVER PAGE */}
        <div className="page-content" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", background: "var(--loading-bg)", color: "white" }}>
          <div style={{ marginTop: "150px" }}>
            <div style={{ width: "100px", height: "10px", background: "#3b82f6", marginBottom: "40px" }} />
            <h1 style={{ color: "white", letterSpacing: "-0.03em", lineHeight: "1" }}>COMPLIANCE<br />ASSESSMENT<br />REPORT</h1>
            <div style={{ fontSize: "20pt", marginTop: "30px", color: "var(--text-light)", fontWeight: "500" }}>{data.compliance} Framework</div>
          </div>
          
          <div style={{ marginBottom: "100px" }}>
            <div style={{ fontSize: "28pt", fontWeight: "800", color: "white", marginBottom: "15px" }}>{data.orgName}</div>
            <div style={{ fontSize: "12pt", color: "var(--text-muted)", display: "flex", gap: "30px" }}>
              <span>DATE: {new Date().toLocaleDateString()}</span>
              <span>TIME: {new Date().toLocaleTimeString()}</span>
            </div>
            <div style={{ marginTop: "40px", fontSize: "10pt", color: "#3b82f6", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Secure. Compliant. Verified.
            </div>
          </div>
        </div>
        <div className="page-break" />

        {/* PAGE 2: SUMMARY */}
        <div className="page-content">
          <div className="accent-bar" />
          <h2>1. Executive Summary</h2>
          <h3>1.1 Organizational Profile</h3>
          <p>This comprehensive compliance assessment has been prepared for <strong>{data.orgName}</strong>. The analysis evaluates the organization's current security infrastructure, operational procedures, and policy alignment with international standards within the {formData.industry || "relevant"} industry sector.</p>
          
          <h3>1.2 Framework Implementation: {data.compliance}</h3>
          <p>The {data.compliance} standard serves as the primary benchmark for this assessment. It provides a robust architecture for managing organizational information security risks, ensuring that integrity, confidentiality, and availability are maintained across all digital assets.</p>
          
          <h3>1.3 Rationale & Strategy</h3>
          <p>The implementation of this framework is strategic, aimed at mitigating potential cyber threats, ensuring regulatory adherence, and strengthening stakeholder confidence. This report identifies baseline implementation levels and provides a focused path toward full compliance.</p>
        </div>
        <div className="page-break" />

        {/* PAGE 3: METHODOLOGY (DOMAIN WISE) */}
        <div className="page-content">
          <div className="accent-bar" />
          <h2>2. Domain-Wise Implementation Scope</h2>
          <p>The assessment methodology was applied specifically across the following architectural domains. Each domain underwent a dedicated collection, analysis, and verification cycle:</p>
          
          <div style={{ marginTop: "40px" }}>
            {data.domainScores.map((domain, i) => (
              <div key={i} style={{ display: "flex", gap: "25px", marginBottom: "35px" }}>
                <div style={{ fontSize: "18pt", fontWeight: "900", color: "#3b82f6", width: "40px" }}>{i < 9 ? `0${i+1}` : i+1}</div>
                <div>
                  <div style={{ fontSize: "13pt", fontWeight: "800", color: "var(--text-main)", marginBottom: "5px" }}>{domain.domain}</div>
                  <div style={{ fontSize: "10.5pt", color: "var(--text-muted)", lineHeight: "1.5" }}>{domain.description}</div>
                  <div style={{ marginTop: "8px", fontSize: "9pt", fontWeight: "700", color: "var(--text-light)", textTransform: "uppercase" }}>
                    Status: {domain.score === 100 ? "Fully Implemented" : "Under Implementation"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="page-break" />

        {/* PAGE 4: ANALYSIS */}
        <div className="page-content" style={{ textAlign: "center" }}>
          <div className="accent-bar" style={{ margin: "0 auto 30px" }} />
          <h2>3. Data Analysis & Findings</h2>
          <p style={{ textAlign: "left" }}>This section provides a visual representation of the current compliance state. Data is derived from the implementation status of individual security controls.</p>
          
          <div style={{ background: "var(--surface-hover)", borderRadius: "20px", padding: "40px", border: "1px solid #e2e8f0", marginTop: "40px" }}>
            <div style={{ fontSize: "14pt", color: "var(--text-muted)", fontWeight: "600" }}>Overall Compliance Posture</div>
            <div style={{ fontSize: "48pt", fontWeight: "900", color: "var(--loading-bg)", margin: "10px 0" }}>{data.score}%</div>
            <div style={{ height: "8px", width: "200px", background: "var(--border-color)", borderRadius: "10px", margin: "0 auto" }}>
              <div style={{ height: "100%", width: `${data.score}%`, background: "#3b82f6", borderRadius: "10px" }} />
            </div>
          </div>

          <div style={{ marginTop: "60px" }}>
            <h3>3.1 Control Distribution Status</h3>
            <PieChart yes={data.yes} partial={data.partial} no={data.no} />
          </div>

          <div style={{ marginTop: "60px" }}>
            <h3>3.2 Domain Performance Analytics</h3>
            <BarChart data={data.domainScores} />
          </div>
        </div>
        <div className="page-break" />

        {/* PAGE 5: IMPACT */}
        <div className="page-content">
          <div className="accent-bar" />
          <h2>4. Impact Analysis & Gaps</h2>
          <p>The assessment has identified several critical gaps that directly influence the organization's security readiness. These findings represent the primary focus for the remediation phase.</p>
          
          <div style={{ background: "var(--danger-bg)", padding: "25px", borderRadius: "12px", borderLeft: "6px solid #be123c", marginBottom: "40px" }}>
            <h4 style={{ color: "#9f1239", margin: "0 0 10px 0", fontSize: "13pt" }}>Security Implications</h4>
            <p style={{ color: "#9f1239", margin: 0 }}>Gaps identified in critical domains significantly increase the risk of unauthorized data access and regulatory non-compliance. Immediate remediation is required for all domains scoring below the 50% threshold.</p>
          </div>
          
          <h3>4.1 Detailed Gap Inventory</h3>
          <table>
            <thead>
              <tr>
                <th>Domain Area</th>
                <th>Identified Vulnerability / Missing Control</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.gaps.map((gap, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: "700", color: "var(--text-main)" }}>{gap.sectionTitle}</td>
                  <td>{gap.question}</td>
                  <td style={{ fontWeight: "800", color: gap.response === "No" ? "#be123c" : "#b45309" }}>{gap.response}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="page-break" />

        {/* PAGE 6: FINANCIALS */}
        <div className="page-content">
          <div className="accent-bar" />
          <h2>5. Investment & Risk Transfer</h2>
          
          <h3>5.1 Financial Cost Estimation</h3>
          <p>The following estimate represents the projected capital and operational expenditure required to remediate all identified vulnerabilities and achieve full framework alignment.</p>
          
          <div style={{ background: "var(--loading-bg)", color: "white", padding: "50px", borderRadius: "20px", textAlign: "center", margin: "40px 0" }}>
            <div style={{ color: "#3b82f6", fontSize: "11pt", fontWeight: "800", textTransform: "uppercase", marginBottom: "10px" }}>Total Estimated Investment</div>
            <div style={{ fontSize: "42pt", fontWeight: "900" }}>{currency.symbol}{Math.round(data.totalEstCostUsd * currency.rate).toLocaleString()}</div>
            <div style={{ fontSize: "14pt", color: "var(--text-light)", marginTop: "10px" }}>Currency: {currency.label}</div>
          </div>
          
          <h3>5.2 Cyber Insurance Recommendation</h3>
          <p>To further mitigate residual risks, the following cyber insurance structure is advised based on the current compliance profile:</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ border: "1px solid #e2e8f0", padding: "20px", borderRadius: "12px" }}>
              <div style={{ fontSize: "9pt", fontWeight: "800", color: "var(--text-muted)", textTransform: "uppercase" }}>Required Level</div>
              <div style={{ fontSize: "18pt", fontWeight: "800", color: "var(--loading-bg)" }}>{data.cyberInsurance.level}</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", padding: "20px", borderRadius: "12px" }}>
              <div style={{ fontSize: "9pt", fontWeight: "800", color: "var(--text-muted)", textTransform: "uppercase" }}>Recommended Limit</div>
              <div style={{ fontSize: "18pt", fontWeight: "800", color: "#3b82f6" }}>{data.cyberInsurance.coverage}</div>
            </div>
          </div>
        </div>
        <div className="page-break" />

        {/* PAGE 7: ROADMAP */}
        <div className="page-content">
          <div className="accent-bar" />
          <h2>6. Remediation Roadmap</h2>
          <p>The following roadmap provides a prioritized sequence of actions. Technical controls identified as "Critical" should be implemented as a priority to secure organizational boundaries.</p>
          
          <table>
            <thead>
              <tr>
                <th style={{ width: "100px" }}>Priority</th>
                <th>Domain Area</th>
                <th>Mitigation Strategy</th>
                <th style={{ width: "120px" }}>Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.gaps.map((gap, i) => (
                <tr key={i}>
                  <td style={{ verticalAlign: "middle" }}>
                    <div style={{ 
                      fontSize: "8pt", fontWeight: "900", padding: "4px 8px", borderRadius: "4px", textAlign: "center",
                      background: gap.response === "No" ? "#fee2e2" : "#ffedd5",
                      color: gap.response === "No" ? "#be123c" : "#b45309"
                    }}>{gap.response === "No" ? "CRITICAL" : "HIGH"}</div>
                  </td>
                  <td style={{ fontWeight: "700" }}>{gap.sectionTitle}</td>
                  <td style={{ fontSize: "9.5pt", lineHeight: "1.5" }}>{gap.rec}</td>
                  <td style={{ fontWeight: "700", color: "var(--loading-bg)" }}>{currency.symbol}{Math.round((gap.response === "No" ? 8000 : 3500) * currency.rate).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="page-break" />

        {/* PAGE 8: OVERALL SUMMARY */}
        <div className="page-content">
          <div className="accent-bar" />
          <h2>7. Overall Summary & Conclusion</h2>
          
          <div style={{ marginTop: "30px" }}>
            <p>This assessment concludes that <strong>{data.orgName}</strong> currently holds a compliance maturity level of <strong>{data.score}%</strong> against the <strong>{data.compliance}</strong> framework. While the organization demonstrates strength in several core domains, significant remediation is required to eliminate vulnerabilities in critical areas.</p>
            
            <h3 style={{ marginTop: "40px", borderLeft: "4px solid #3b82f6", paddingLeft: "20px" }}>Final Verdict</h3>
            <p style={{ fontStyle: "italic", fontSize: "12pt", color: "var(--text-main)" }}>
              "The current security posture is {data.score > 75 ? "Strong" : data.score > 50 ? "Moderate" : "At-Risk"}. Adherence to the remediation roadmap provided in Section 6 is vital for achieving operational resilience and regulatory alignment."
            </p>

            <div style={{ marginTop: "60px", background: "var(--surface-hover)", padding: "30px", borderRadius: "16px" }}>
              <h4 style={{ margin: "0 0 15px 0", fontWeight: "800", textTransform: "uppercase", fontSize: "10pt", color: "var(--text-muted)" }}>Assessment Certification</h4>
              <p style={{ fontSize: "9.5pt", margin: 0 }}>This report is a verified output of the GRC Copilot Engine based on submitted organizational data. It serves as an official record of the compliance state as of {new Date().toLocaleDateString()}.</p>
            </div>
          </div>
          
          <div style={{ marginTop: "150px", borderTop: "1px solid #e2e8f0", paddingTop: "20px", textAlign: "center", fontSize: "9pt", color: "var(--text-light)" }}>
            End of Compliance Assessment Report — Produced by GRC Copilot
          </div>
        </div>

      </div>
    </div>
  );
}
