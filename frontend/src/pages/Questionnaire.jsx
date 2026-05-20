import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getSectionsForCompliance } from "../data/questionnaireConfig";

const OPTIONS = [
  { label: "Yes", className: "yes" },
  { label: "Partial", className: "partial" },
  { label: "No", className: "no" },
  { label: "N/A", className: "na" }
];

export default function Questionnaire() {
  const navigate = useNavigate();
  const compliance = sessionStorage.getItem("compliance") || "ISO/IEC 27001";
  
  const sections = useMemo(() => getSectionsForCompliance(compliance), [compliance]);
  const [answers, setAnswers] = useState(JSON.parse(sessionStorage.getItem("answers") || "{}"));
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAnswerSelect = (sectionId, qIdx, answer) => {
    const key = `${sectionId}__${qIdx}`;
    const newAnswers = { ...answers, [key]: answer };
    setAnswers(newAnswers);
    sessionStorage.setItem("answers", JSON.stringify(newAnswers));
  };

  const totalQuestions = useMemo(() => sections.reduce((n, s) => n + s.questions.length, 0), [sections]);
  const answeredCount = Object.keys(answers).length;
  const progress = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="page" style={{ background: "var(--bg-color)", justifyContent: "flex-start", paddingTop: 40 }}>
      <div className="page-header wide" style={{ maxWidth: 800, width: "100%", marginBottom: 20 }}>
        <button type="button" className="btn btn-back" onClick={() => navigate(-1)}>Back</button>
      </div>

      <div className="card card-wide" style={{ maxWidth: 800, padding: 48, border: "1px solid var(--cyber-border)" }}>
        <div style={{ marginBottom: 32, borderBottom: "1px solid var(--border-color)", paddingBottom: 24 }}>
          <h1 style={{ marginBottom: 8, color: "var(--text-main)" }}>Assessment Questionnaire</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            {compliance} framework assessment. Complete all sections to generate your report.
          </p>
        </div>

        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Completion Progress</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--primary)" }}>{progress}%</span>
          </div>
          <div className="questionnaire-progress">
            <div className="questionnaire-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-light)", marginTop: 8 }}>{answeredCount} of {totalQuestions} controls addressed</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {sections.map((section, sIdx) => {
            const isOpen = !!expandedSections[section.id];
            return (
              <div 
                key={section.id} 
                style={{ 
                  border: "1px solid " + (isOpen ? "var(--primary)" : "var(--border-color)"),
                  borderRadius: 16, overflow: "hidden", background: isOpen ? "#fff" : "rgba(255, 255, 255, 0.4)",
                  transition: "all 0.2s ease"
                }}
              >
                <button 
                  type="button" 
                  onClick={() => toggleSection(section.id)}
                  style={{ 
                    padding: "20px 24px", background: "none", border: "none", width: "100%",
                    display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ 
                      width: 24, height: 24, borderRadius: "50%", 
                      background: isOpen ? "var(--primary)" : "var(--border-color)",
                      display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.7rem"
                    }}>
                      {sIdx + 1}
                    </div>
                    <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>{section.title}</span>
                  </div>
                  <span style={{ color: "var(--text-light)", transition: "transform 0.2s ease", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                </button>

                {isOpen && (
                  <div style={{ padding: "0 24px 24px", borderTop: "1px solid var(--border-color)" }}>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 16, marginBottom: 20 }}>{section.description}</p>
                    {section.questions.map((q, qIdx) => {
                      const key = `${section.id}__${qIdx}`;
                      return (
                        <div key={qIdx} style={{ marginTop: 24, padding: 20, background: 'var(--surface-hover)', borderRadius: 12 }}>
                          <p style={{ fontSize: "0.95rem", color: "var(--text-main)", marginBottom: 16 }}>{q}</p>
                          <div className="answer-options">
                            {OPTIONS.map((opt) => (
                              <button 
                                key={opt.label} 
                                type="button" 
                                className={`answer-btn ${answers[key] === opt.label ? opt.className : ""}`} 
                                onClick={() => handleAnswerSelect(section.id, qIdx, opt.label)}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="divider" style={{ margin: "40px 0" }} />
        <button 
          type="button" 
          className="btn btn-primary" 
          onClick={() => navigate("/dashboard")}
          style={{ height: 56, fontSize: "1.1rem" }}
          disabled={answeredCount === 0}
        >
          View Dashboard
        </button>
      </div>
    </div>
  );
}
