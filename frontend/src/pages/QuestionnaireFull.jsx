import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getQuestionsV2, submitResponseV2, uploadEvidenceV2 } from "../api";
import { AUDIT_QUESTIONS } from "../data/auditQuestions";

const MATURITY_LEVELS = [
  { val: 0, label: "Non-Existent", desc: "No recognizable process", color: "#ef4444" },
  { val: 1, label: "Initial", desc: "Ad-hoc and disorganized", color: "#f87171" },
  { val: 2, label: "Repeatable", desc: "Processes follow regular pattern", color: "#fb923c" },
  { val: 3, label: "Defined", desc: "Processes documented", color: "#fcd34d" },
  { val: 4, label: "Managed", desc: "Measured and controlled", color: "#a3e635" },
  { val: 5, label: "Optimized", desc: "Automated best practices", color: "#22c55e" },
];

const AUDIT_OPTIONS = [
  { val: 5, label: "Compliant", color: "#22c55e", icon: "✓" },
  { val: 2.5, label: "Partial", color: "#f59e0b", icon: "!" },
  { val: 0, label: "Non-Compliant", color: "#ef4444", icon: "✕" },
  { val: -1, label: "Not Applicable", color: "#94a3b8", icon: "—" },
];

export default function QuestionnaireFull() {
  const navigate = useNavigate();
  const assessmentId = sessionStorage.getItem("assessmentId");
  const auditMode = sessionStorage.getItem("auditMode"); // "internal" or "vendor"
  
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [evidence, setEvidence] = useState({});
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState("questionnaire"); // "questionnaire" or "review"

  useEffect(() => {
    if (!assessmentId) {
      navigate("/start");
      return;
    }

    const loadQuestions = async () => {
      try {
        let flattened = [];
        if (auditMode && AUDIT_QUESTIONS[auditMode]) {
          flattened = AUDIT_QUESTIONS[auditMode];
        } else {
          const res = await getQuestionsV2(assessmentId);
          if (Array.isArray(res.questions)) {
            res.questions.forEach(domain => {
              domain.controls.forEach(control => {
                control.questions.forEach(q => {
                  flattened.push({
                    ...q,
                    id: q.question_id || q.id,
                    category: domain.name,
                    control_id: control.id,
                    control_name: control.name
                  });
                });
              });
            });
          }
        }
        setQuestions(flattened);
      } catch (err) {
        console.error("Failed to load questions:", err);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [assessmentId, navigate, auditMode]);

  const currentQuestion = questions[currentIndex];

  const handleMaturitySelect = async (val, type = "maturity") => {
    if (!currentQuestion) return;
    
    const auditKey = currentQuestion.id + "_audit";
    const maturityKey = currentQuestion.id;
    
    let newAnswers = { ...answers };
    if (type === "audit") {
      newAnswers[auditKey] = val;
    } else {
      newAnswers[maturityKey] = val;
    }
    setAnswers(newAnswers);

    const auditVal = type === "audit" ? val : (answers[auditKey] ?? -1);
    const maturityVal = type === "maturity" ? val : (answers[maturityKey] ?? 0);

    const auditLabel = AUDIT_OPTIONS.find(o => o.val === auditVal)?.label || "Not Answered";
    const maturityLabel = MATURITY_LEVELS[maturityVal]?.label || "Non-Existent";

    try {
      await submitResponseV2(assessmentId, currentQuestion.id, {
        maturity_score: maturityVal,
        answer_text: auditMode ? `Audit: ${auditLabel} | Maturity: ${maturityLabel}` : maturityLabel,
        audit_answer: auditLabel,
        is_na: auditVal === -1,
        category: currentQuestion.category
      });
    } catch (err) {
      console.error("Failed to submit response:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files.length || !currentQuestion) return;

    setUploading(true);
    try {
      const res = await uploadEvidenceV2(assessmentId, currentQuestion.id, files);
      setEvidence(prev => ({
        ...prev,
        [currentQuestion.id]: [...(prev[currentQuestion.id] || []), ...res.files]
      }));
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const next = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setView("review");
    }
  };

  const prev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const finish = () => {
    navigate(`/report-v2/${assessmentId}`);
  };

  if (loading) return <div className="page"><div className="loader"></div><h1>Loading Professional Assessment...</h1></div>;
  if (!questions.length) return <div className="page"><h1>No questions found for this framework.</h1></div>;

  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);
  const answeredCount = Object.keys(answers).filter(k => !k.endsWith("_audit")).length;

  if (view === "review") {
    return (
      <div className="page" style={{ background: "#f1f5f9", paddingTop: 40, paddingBottom: 60, overflowY: "auto" }}>
        <div className="card card-wide" style={{ maxWidth: 1000, padding: 0, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "40px 60px", background: "#1e293b", color: "#fff" }}>
            <h1 style={{ margin: 0, fontSize: "1.75rem" }}>Review Assessment</h1>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>Please review your responses before generating the final compliance report.</p>
          </div>
          
          <div style={{ padding: "40px 60px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <div>
                <span style={{ fontSize: "2rem", fontWeight: 800 }}>{answeredCount}</span>
                <span style={{ color: "#64748b", marginLeft: 8 }}>Controls Evaluated</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-outline" onClick={() => setView("questionnaire")}>Back to Questions</button>
                <button className="btn btn-primary" onClick={finish} style={{ padding: "12px 32px" }}>Generate Report</button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {questions.map((q, i) => {
                const ans = answers[q.id];
                const auditAns = answers[q.id + "_audit"];
                const mat = MATURITY_LEVELS[ans] || MATURITY_LEVELS[0];
                const aud = AUDIT_OPTIONS.find(o => o.val === auditAns) || AUDIT_OPTIONS[3];
                
                return (
                  <div key={i} style={{ padding: 20, border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>{q.category}</div>
                      <div style={{ fontWeight: 600, color: "#1e293b" }}>{q.text}</div>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginLeft: 24 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Maturity</div>
                        <div style={{ color: mat.color, fontWeight: 700 }}>{mat.label} ({ans ?? 0})</div>
                      </div>
                      {auditMode && (
                        <div style={{ textAlign: "right", minWidth: 100 }}>
                          <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Audit</div>
                          <div style={{ color: aud.color, fontWeight: 700 }}>{aud.label}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={{ marginTop: 40, textAlign: "center" }}>
               <button className="btn btn-primary btn-wide" onClick={finish} style={{ height: 54, fontSize: "1.1rem" }}>Submit & Generate CISO Report</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ background: "#f8fafc", justifyContent: "flex-start", paddingTop: 30, overflowY: "auto" }}>
      <div className="page-header wide" style={{ maxWidth: 950, width: "100%", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button className="btn btn-back" style={{ marginBottom: 0, padding: "8px 16px", fontSize: "0.85rem" }} onClick={() => navigate(-1)}>Save & Exit</button>
          <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", marginBottom: 4, textTransform: "uppercase" }}>Progress: {progress}%</div>
              <div style={{ width: 200, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "var(--primary)", transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }} />
              </div>
            </div>
            <div style={{ padding: "8px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
               {currentIndex + 1} / {questions.length}
            </div>
          </div>
        </div>
      </div>

      <div className="card card-wide" style={{ maxWidth: 950, padding: 0, border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", overflow: "hidden", background: "#fff" }}>
        {/* Category Header */}
        <div style={{ background: "#f8fafc", padding: "16px 40px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
           <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{currentQuestion.category}</span>
           <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8" }}>Control ID: {currentQuestion.control_id || currentQuestion.id}</span>
        </div>

        <div style={{ padding: "40px 50px" }}>
          <h2 style={{ fontSize: "1.6rem", lineHeight: 1.35, color: "#1e293b", marginBottom: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>
            {currentQuestion.text}
          </h2>
          
          {currentQuestion.hint && (
            <div style={{ color: "#475569", fontSize: "0.95rem", background: "#f0f9ff", padding: "16px 20px", borderRadius: 10, borderLeft: "4px solid #3b82f6", marginBottom: 40, lineHeight: 1.5 }}>
              <strong style={{ color: "#0369a1", display: "block", marginBottom: 4, fontSize: "0.75rem", textTransform: "uppercase" }}>Guidance</strong>
              {currentQuestion.hint}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            {/* Audit Options */}
            {auditMode && (
              <div>
                <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16, color: "#64748b", fontWeight: 800 }}>1. Compliance Status</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  {AUDIT_OPTIONS.map((opt) => {
                    const isSelected = answers[currentQuestion.id + "_audit"] === opt.val;
                    return (
                      <button
                        key={opt.label}
                        onClick={() => handleMaturitySelect(opt.val, "audit")}
                        style={{
                          padding: "16px 12px",
                          borderRadius: 12,
                          border: "2px solid " + (isSelected ? opt.color : "#f1f5f9"),
                          background: isSelected ? (opt.color + "08") : "#fff",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 8,
                          textAlign: "center"
                        }}
                      >
                        <div style={{ 
                          width: 32, height: 32, borderRadius: "50%", background: isSelected ? opt.color : "#f8fafc",
                          display: "flex", alignItems: "center", justifyContent: "center", color: isSelected ? "#fff" : "#cbd5e1",
                          fontSize: "1.2rem", fontWeight: 900
                        }}>{opt.icon}</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: isSelected ? opt.color : "#64748b" }}>{opt.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Maturity Scale */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
                <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", fontWeight: 800 }}>{auditMode ? "2. Implementation Maturity" : "Implementation Maturity Scale"}</h3>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)" }}>Level {answers[currentQuestion.id] ?? 0} Selected</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {MATURITY_LEVELS.map((level) => {
                  const isSelected = answers[currentQuestion.id] === level.val;
                  return (
                    <button
                      key={level.val}
                      onClick={() => handleMaturitySelect(level.val, "maturity")}
                      onMouseEnter={() => {}} // Could add tooltip here
                      style={{
                        flex: 1,
                        padding: "12px 8px",
                        borderRadius: 10,
                        background: isSelected ? level.color : "#fff",
                        border: "1px solid " + (isSelected ? level.color : "#e2e8f0"),
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        color: isSelected ? "#fff" : "#64748b",
                        cursor: "pointer",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: isSelected ? `0 4px 12px ${level.color}40` : "none"
                      }}
                    >
                      <span style={{ fontSize: "1.1rem", fontWeight: 900 }}>{level.val}</span>
                      <span style={{ fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", textAlign: "center" }}>{level.label}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#f8fafc", borderRadius: 8, fontSize: "0.8rem", color: "#64748b", fontStyle: "italic", textAlign: "center" }}>
                {MATURITY_LEVELS[answers[currentQuestion.id] ?? 0].desc}
              </div>
            </div>

            {/* Evidence */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 40 }}>
              <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 16, color: "#64748b", fontWeight: 800 }}>Artifacts & Evidence</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div style={{ 
                  padding: "30px 20px", border: "2px dashed #e2e8f0", borderRadius: 12, 
                  textAlign: "center", background: "#fcfcfc", cursor: "pointer", transition: "all 0.2s ease"
                }} onMouseOver={e => e.currentTarget.style.borderColor = "var(--primary)"} onMouseOut={e => e.currentTarget.style.borderColor = "#e2e8f0"}>
                  <input type="file" multiple onChange={handleFileUpload} id="evidence-upload" style={{ display: "none" }} />
                  <label htmlFor="evidence-upload" style={{ cursor: "pointer", display: "block" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>📎</div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--primary)" }}>
                      {uploading ? "Uploading artifacts..." : "Attach evidence files"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 4 }}>PDF, DOCX, PNG, JPG, XLSX (Max 10MB)</div>
                  </label>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {evidence[currentQuestion.id] && evidence[currentQuestion.id].length > 0 ? (
                    evidence[currentQuestion.id].map((file, i) => (
                      <div key={i} style={{ 
                        padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", 
                        borderRadius: 8, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 12
                      }}>
                        <span style={{ color: "#22c55e", fontWeight: 900 }}>✓</span>
                        <span style={{ flex: 1, color: "#166534", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.original_name}</span>
                        <span style={{ fontSize: "0.7rem", color: "#86efac" }}>{(file.file_size / 1024).toFixed(0)} KB</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1", fontSize: "0.85rem", background: "#fcfcfc", borderRadius: 12, border: "1px solid #f1f5f9", fontStyle: "italic" }}>
                      No evidence attached yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div style={{ background: "#f8fafc", padding: "24px 50px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button className="btn btn-outline" onClick={prev} disabled={currentIndex === 0} style={{ padding: "12px 28px", height: "auto", fontWeight: 700 }}>
            Previous
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
             <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600 }}>Tip: All answers are saved automatically</span>
             <button className="btn btn-primary" onClick={next} style={{ padding: "12px 40px", height: "auto", fontWeight: 800, borderRadius: 10, boxShadow: "0 4px 12px var(--primary-light)" }}>
               {currentIndex === questions.length - 1 ? "Review All Responses" : "Next Control →"}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

