import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSectionsForCompliance, SECTION_LIBRARY } from "../data/questionnaireConfig";
import { chatWithAI } from "../api";

const CURRENCIES = [
  { code: "USD", symbol: "$", rate: 1, label: "United States (USD)" },
  { code: "INR", symbol: "₹", rate: 83.5, label: "India (INR)" },
  { code: "EUR", symbol: "€", rate: 0.92, label: "European Union (EUR)" },
  { code: "GBP", symbol: "£", rate: 0.79, label: "United Kingdom (GBP)" },
  { code: "AED", symbol: "dh ", rate: 3.67, label: "Middle East (AED)" },
  { code: "ZAR", symbol: "R ", rate: 18.8, label: "Africa (ZAR)" },
  { code: "KZT", symbol: "₸", rate: 450, label: "Central Asia (KZT)" },
];

function DonutChart({ score, size = 160, label = "Compliance" }) {
  const r = 58, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : score >= 25 ? "#f97316" : "#ef4444";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size} viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#e5e7eb" strokeWidth="14" />
        <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="14" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 80 80)" />
        <text x="80" y="74" textAnchor="middle" fontSize="32" fontWeight="800" fill="var(--text-main)">{score}%</text>
        <text x="80" y="96" textAnchor="middle" fontSize="11" fill="var(--text-muted)">{label}</text>
      </svg>
    </div>
  );
}

function BarChart({ data, height = 280 }) {
  if (!data.length) return null;
  const spacing = 32;
  const chartH = height - 80;
  const totalW = 800;
  const barW = (totalW - (data.length + 1) * spacing) / data.length;
  
  return (
    <div style={{ width: "100%", height: height, display: 'flex', justifyContent: 'center' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${totalW} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: "visible" }}>
        {data.map((d, i) => {
          const val = d.score || 0;
          const barH = (val / 100) * chartH;
          const x = i * (barW + spacing) + spacing;
          const y = chartH - barH + 20;
          const color = val >= 75 ? "#22c55e" : val >= 50 ? "#f59e0b" : val >= 25 ? "#f97316" : "#ef4444";
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx="6" fill={color} opacity="0.8" />
              <text x={x + barW / 2} y={y - 10} textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--text-main)">{val}%</text>
              <text x={x + barW / 2} y={chartH + 40} textAnchor="middle" fontSize="11" fill="var(--text-muted)" fontWeight="700">
                {d.name}
              </text>
            </g>
          );
        })}
        <line x1="0" y1={chartH + 20} x2={totalW} y2={chartH + 20} stroke="var(--border-color)" strokeWidth="2" />
      </svg>
    </div>
  );
}

function PieChart({ yes, partial, no, size = 200 }) {
  const total = yes + partial + no;
  if (total === 0) return <div style={{ height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data</div>;
  const r = 50, c = 2 * Math.PI * r;
  const slices = [
    { label: "Yes", value: yes, color: "#22c55e" },
    { label: "Partial", value: partial, color: "#f59e0b" },
    { label: "No", value: no, color: "#ef4444" }
  ];
  let currentOffset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 48, width: "100%" }}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        {slices.map((slice, i) => {
          if (slice.value === 0) return null;
          const strokeDash = (slice.value / total) * c;
          const offset = currentOffset;
          currentOffset -= strokeDash;
          return (
            <circle key={i} cx="60" cy="60" r={r} fill="none" stroke={slice.color} strokeWidth="20" strokeDasharray={`${strokeDash} ${c - strokeDash}`} strokeDashoffset={offset} transform="rotate(-90 60 60)" />
          );
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {slices.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "1rem", fontWeight: 700 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, background: s.color }} />
            <span style={{ color: "var(--text-main)" }}>{s.label}: {s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const RecommendationModal = ({ action, onClose, currency }) => {
  if (!action) return null;
  const formattedCost = `${currency.symbol}${Math.round(action.costUsd * currency.rate).toLocaleString()}`;
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div className="card" style={{ maxWidth: 700, padding: 48, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
        <h2 style={{ color: 'var(--primary)', marginBottom: 24, fontSize: '1.8rem' }}>{action.domain} Recommendation</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div>
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: 12, letterSpacing: '0.05em' }}>Issue Definition</h4>
            <p style={{ color: 'var(--text-main)', lineHeight: 1.7, fontSize: '1.05rem' }}>{action.issue}</p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: 12, letterSpacing: '0.05em' }}>Mitigation Strategy</h4>
            <p style={{ color: 'var(--text-main)', lineHeight: 1.7, fontSize: '1.05rem' }}>{action.mitigation}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: 12, letterSpacing: '0.05em' }}>Timeline</h4>
              <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.1rem' }}>{action.timeline}</p>
            </div>
            <div>
              <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: 12, letterSpacing: '0.05em' }}>Est. Cost</h4>
              <p style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.2rem' }}>{formattedCost}</p>
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 40, width: '100%', height: 54 }}>Close Details</button>
      </div>
    </div>
  );
};

const AssistantChat = ({ context }) => {
  const [messages, setMessages] = useState([{ role: 'assistant', content: "Hello! I'm your GRC Assistant. How can I help you with your compliance journey today?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await chatWithAI(input, messages, context);
      setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-wide" style={{ maxWidth: 'none', padding: 0, height: '500px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '20px 32px', background: 'var(--surface-hover)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }}></div>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>GRC AI Assistant</h2>
      </div>
      
      <div ref={scrollRef} style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ 
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            padding: '12px 18px',
            borderRadius: i === 0 ? '0 16px 16px 16px' : (m.role === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0'),
            background: m.role === 'user' ? 'var(--primary)' : 'var(--surface-hover)',
            color: m.role === 'user' ? '#fff' : 'var(--text-main)',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            border: m.role === 'user' ? 'none' : '1px solid var(--border-color)'
          }}>
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--surface-hover)', padding: '12px 18px', borderRadius: '0 16px 16px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Assistant is typing...
          </div>
        )}
      </div>

      <form onSubmit={handleSend} style={{ padding: '20px 32px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 12 }}>
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything about your assessment..."
          style={{ flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-on-dark)', outline: 'none' }}
        />
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: 'auto', padding: '0 24px', height: 46 }}>
          Send
        </button>
      </form>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedAction, setSelectedAction] = useState(null);
  const [currencyCode, setCurrencyCode] = useState(sessionStorage.getItem("selectedCurrency") || "USD");
  
  const handleCurrencyChange = (code) => {
    setCurrencyCode(code);
    sessionStorage.setItem("selectedCurrency", code);
  };
  
  const currency = useMemo(() => CURRENCIES.find(c => c.code === currencyCode), [currencyCode]);
  
  const compliance = sessionStorage.getItem("compliance") || "ISO/IEC 27001";
  const answers = JSON.parse(sessionStorage.getItem("answers") || "{}");
  const formData = JSON.parse(sessionStorage.getItem("assessmentFormData") || "{}");
  
  const sections = useMemo(() => getSectionsForCompliance(compliance), [compliance]);
  
  const stats = useMemo(() => {
    let total = 0, answered = 0, yes = 0, no = 0, partial = 0;
    sections.forEach(s => {
      s.questions.forEach((_, i) => {
        total++;
        const key = `${s.id}__${i}`;
        const ans = answers[key];
        if (ans) {
          answered++;
          if (ans === "Yes") yes++;
          else if (ans === "No") no++;
          else if (ans === "Partial") partial++;
        }
      });
    });
    const denom = yes + no + partial;
    const score = denom > 0 ? Math.round((yes / denom) * 100) : 0;
    
    const domainScores = sections.map(s => {
      let dTotal = 0, dYes = 0;
      s.questions.forEach((_, i) => {
        const key = `${s.id}__${i}`;
        const ans = answers[key];
        if (ans && ans !== "N/A") {
          dTotal++;
          if (ans === "Yes") dYes++;
        }
      });
      const dScore = dTotal > 0 ? Math.round((dYes / dTotal) * 100) : 0;
      return { id: s.id, name: s.title, score: dScore };
    });

    let totalEstCostUsd = 0;
    const actions = domainScores.filter(d => d.score < 100).map(d => {
      const priority = d.score < 40 ? "Critical" : d.score < 70 ? "High" : "Medium";
      const sectionEntry = Object.entries(SECTION_LIBRARY).find(([_, value]) => value.title === d.name);
      const desc = sectionEntry ? sectionEntry[1].description : "Domain controls analysis.";
      
      const costUsd = d.score < 50 ? 8000 : 3500;
      totalEstCostUsd += costUsd;

      return {
        domain: d.name,
        description: desc,
        recommendation: `Strengthen ${d.name} Controls`,
        priority,
        costUsd,
        score: d.score,
        issue: `Compliance score for ${d.name} is currently at ${d.score}%. Several controls are either missing or only partially implemented.`,
        mitigation: `Perform a detailed gap analysis of ${d.name} controls. Implement missing policies, update existing procedures, and ensure technical safeguards are active.`,
        timeline: d.score < 50 ? "1-3 Months" : "3-6 Months"
      };
    });

    const riskLevel = score >= 75 ? "Low" : score >= 50 ? "Medium" : score >= 25 ? "High" : "Critical";
    const getSecurityLevel = (s) => s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : s >= 60 ? "D" : s >= 50 ? "E" : "F";
    let cyberLevel = "Optional", cyberCoverage = "$50K - $100K";
    if (score < 30) { cyberLevel = "Required"; cyberCoverage = "$500K - $1M+"; }
    else if (score < 60) { cyberLevel = "Recommended"; cyberCoverage = "$100K - $500K"; }

    return { total, answered, score, yes, no, partial, domainScores, riskLevel, securityLevel: getSecurityLevel(score), cyberInsurance: { level: cyberLevel, coverage: cyberCoverage }, actions, totalEstCostUsd };
  }, [sections, answers]);

  const displayCost = `${currency.symbol}${Math.round(stats.totalEstCostUsd * currency.rate).toLocaleString()}`;

  const PAGE_MAX_WIDTH = 1440;

  return (
    <div className="page" style={{ justifyContent: 'flex-start', background: 'var(--bg-color)', paddingTop: 40, paddingBottom: 60 }}>
      <div className="page-header wide" style={{ maxWidth: PAGE_MAX_WIDTH, width: '96%', marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--text-on-dark)', marginBottom: 4, fontWeight: 800, fontSize: '2.5rem' }}>{formData.orgName || "Organization"} Dashboard</h1>
          <p className="subtitle" style={{ marginBottom: 0, fontSize: '1.1rem' }}>Framework: <span style={{color: 'var(--primary)', fontWeight: 700}}>{compliance}</span></p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => navigate("/start")} className="btn btn-back" style={{ width: 'auto', padding: '12px 24px', marginBottom: 0 }}>Back</button>
          <button onClick={() => navigate("/questions")} className="btn btn-outline" style={{ width: 'auto', padding: '12px 24px' }}>Continue Assessment</button>
          <button onClick={() => navigate("/report")} className="btn btn-primary" style={{ width: 'auto', padding: '12px 24px' }}>View Report</button>
        </div>
      </div>

      <div style={{ maxWidth: PAGE_MAX_WIDTH, width: '96%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr 1.5fr', gap: 24, marginBottom: 32 }}>
          <div className="card" style={{ maxWidth: 'none', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
             <DonutChart score={stats.score} size={140} label="Compliance" />
          </div>
          <StatCard title="Risk Level" value={stats.riskLevel} sub="Based on gaps" isRisk={stats.riskLevel !== 'Low'} />
          <StatCard title="Security Level" value={stats.securityLevel} sub="Global rating (A-F)" />
          <StatCard title="Cyber Insurance" value={stats.cyberInsurance.level} sub={`Coverage: ${stats.cyberInsurance.coverage}`} />
          <div className="card" style={{ maxWidth: 'none', padding: 28, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Est. Remediation Cost</span>
              <select 
                value={currencyCode} 
                onChange={(e) => handleCurrencyChange(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--surface-hover)', cursor: 'pointer', outline: 'none' }}
              >
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, margin: '4px 0', color: 'var(--primary)' }}>{displayCost}</div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Total for all identified gaps</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32, marginBottom: 40 }}>
          <div className="card" style={{ maxWidth: 'none', padding: 40, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 20, marginBottom: 32 }}>Domain Performance</h2>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart data={stats.domainScores} />
            </div>
          </div>
          <div className="card" style={{ maxWidth: 'none', padding: 40, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: 20, marginBottom: 40 }}>Compliance Status</h2>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <PieChart yes={stats.yes} partial={stats.partial} no={stats.no} />
            </div>
          </div>
        </div>

        <div className="card card-wide" style={{ maxWidth: 'none', padding: 48, marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 10, height: 32, background: '#ef4444', borderRadius: 4 }} />
            Risk Identified
          </h2>
          {stats.actions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0', fontSize: '1.2rem' }}>No significant risks identified. All controls are meeting targets.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              {stats.actions.map((action, i) => (
                <div key={i} style={{ padding: '24px', background: 'var(--surface-hover)', borderRadius: 16, border: '1px solid var(--border-color)', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <h4 style={{ color: 'var(--text-main)', fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>{action.domain} Risk</h4>
                    <span style={{ 
                      fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px', borderRadius: 20, textTransform: 'uppercase',
                      background: action.priority === 'Critical' ? '#fee2e2' : action.priority === 'High' ? '#ffedd5' : '#fef3c7',
                      color: action.priority === 'Critical' ? '#ef4444' : action.priority === 'High' ? '#f97316' : '#f59e0b',
                    }}>
                      {action.priority}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                    Identified a {action.priority.toLowerCase()} priority gap in {action.domain.toLowerCase()} with a current compliance score of {action.score}%. This represents a potential vulnerability in your security posture.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-wide" style={{ maxWidth: 'none', padding: 48, marginBottom: 40 }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ width: 10, height: 32, background: 'var(--primary)', borderRadius: 4 }} />
            Actions to Take
          </h2>
          {stats.actions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0', fontSize: '1.2rem' }}>All domains are fully compliant. No immediate actions required.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', background: 'var(--surface-hover)', padding: '20px 32px', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                <span>Domain & Context</span>
                <span style={{ textAlign: 'center' }}>Priority Scale</span>
                <span style={{ textAlign: 'right' }}>Action</span>
              </div>
              {stats.actions.map((action, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', alignItems: 'center', padding: '32px', background: 'white', borderBottom: i === stats.actions.length - 1 ? 'none' : '1px solid var(--border-color)', transition: 'background 0.2s ease' }}>
                  <div>
                    <h4 style={{ color: 'var(--primary)', fontSize: '1.2rem', margin: '0 0 8px', fontWeight: 700 }}>{action.domain}</h4>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, paddingRight: 40 }}>{action.description}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{ 
                      fontSize: '0.8rem', fontWeight: 800, padding: '8px 20px', borderRadius: 24, textTransform: 'uppercase', minWidth: 120, textAlign: 'center',
                      background: action.priority === 'Critical' ? '#fee2e2' : action.priority === 'High' ? '#ffedd5' : '#fef3c7',
                      color: action.priority === 'Critical' ? '#ef4444' : action.priority === 'High' ? '#f97316' : '#f59e0b',
                      border: `1px solid ${action.priority === 'Critical' ? '#fecaca' : action.priority === 'High' ? '#fed7aa' : '#fde68a'}`
                    }}>
                      {action.priority}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => setSelectedAction(action)} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '10px 24px', height: 'auto', borderRadius: 8, fontWeight: 700, whiteSpace: 'nowrap', boxShadow: 'var(--glow)' }}>
                      View Recommendation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ASSISTANT CHAT SECTION */}
        <AssistantChat context={{ orgName: formData.orgName, framework: compliance, score: stats.score, riskLevel: stats.riskLevel }} />
      </div>
      
      <RecommendationModal action={selectedAction} onClose={() => setSelectedAction(null)} currency={currency} />
    </div>
  );
}

const StatCard = ({ title, value, sub, isRisk, large }) => (
  <div className="card" style={{ maxWidth: 'none', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
    <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{title}</span>
    <div style={{ fontSize: '2rem', fontWeight: 800, margin: '8px 0', color: isRisk ? '#ef4444' : 'var(--text-main)' }}>{value}</div>
    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{sub}</span>
  </div>
);
