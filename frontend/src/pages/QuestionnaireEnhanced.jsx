import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getQuestionsV2, submitResponseV2, uploadEvidenceV2, completeAssessmentV2, autoAnswerPolicy, getCurrentUser } from "../api";
import { useToast } from "../components/Toast";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";


const STORAGE_KEY = "enhanced_questionnaire_progress";

const MATURITY_LEVELS = [
  { val: 0, label: "Non-Existent", desc: "No recognizable process exists", color: "var(--danger)" },
  { val: 1, label: "Initial", desc: "Ad-hoc and disorganized processes", color: "var(--danger)" },
  { val: 2, label: "Developing", desc: "Basic processes emerging but informal", color: "var(--warning)" },
  { val: 3, label: "Defined", desc: "Processes documented and standardized", color: "var(--warning)" },
  { val: 4, label: "Managed", desc: "Measured, controlled, and continuously improved", color: "var(--success)" },
  { val: 5, label: "Optimized", desc: "Automated best practices with metrics-driven improvement", color: "var(--success)" },
];

const COMPLIANCE_OPTIONS = [
  { val: 0, label: "Yes", desc: "Fully meets the control requirement", color: "var(--success)" },
  { val: 1, label: "Partial", desc: "Partially implements the control", color: "var(--warning)" },
  { val: 2, label: "No", desc: "Does not meet the control requirement", color: "var(--danger)" },
  { val: 3, label: "N/A", desc: "Control does not apply", color: "var(--text-light)" },
];

export default function QuestionnaireEnhanced() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const user = getCurrentUser();
  const username = user?.email ? user.email.split("@")[0] : "user";
  const roleLabel = (user?.role || "TEAM MEMBER").replace(/_/g, " ").toUpperCase();
  const isTeamLead = user?.role === 'lead';
  const assessmentId = id && id !== "new" ? id : sessionStorage.getItem("assessmentId");

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [evidence, setEvidence] = useState({});
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState("questionnaire");
  const [saving, setSaving] = useState(false);
  const [aiInsights, setAiInsights] = useState({});
  const [showExitModal, setShowExitModal] = useState(false);
  const autoAdvanceTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, [currentIndex]);

  useEffect(() => {
    if (!assessmentId) {
      toast.addToast("No assessment found. Starting a new one.", "info");
      navigate("/start");
      return;
    }
    loadQuestions();
    loadSavedProgress();
  }, [assessmentId]);

  const loadQuestions = async () => {
    try {
      const data = await getQuestionsV2(assessmentId);
      const flatQuestions = [];
      if (data.questions && Array.isArray(data.questions)) {
        data.questions.forEach((domain) => {
          if (!domain.controls || !Array.isArray(domain.controls)) return;
          domain.controls.forEach((ctrl) => {
            if (!ctrl.questions || !Array.isArray(ctrl.questions)) return;
            ctrl.questions.forEach((q) => {
              flatQuestions.push({
                ...q,
                domainName: domain.name,
                controlName: ctrl.name,
                control: ctrl.id || ctrl.name,
              });
            });
          });
        });
      }
      setQuestions(flatQuestions);
    } catch (err) {
      console.error("Failed to load questions:", err);
      toast.addToast(err.message || "Failed to load questions", "error");
      if (err.status === 404 || err.status === 403 || err.message.includes('Unauthorized')) {
        navigate("/start");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSavedProgress = useCallback(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { answers: savedAnswers, currentIndex: savedIndex } = JSON.parse(saved);
        if (savedAnswers) setAnswers(savedAnswers);
        if (savedIndex !== undefined) setCurrentIndex(savedIndex);
      }
    } catch (err) {
      console.error("Failed to load progress:", err);
    }
  }, []);

  const saveProgress = useCallback((currentAnswers, index) => {
    if (isTeamLead) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ answers: currentAnswers, currentIndex: index, timestamp: Date.now() })
      );
    } catch (err) {
      console.error("Failed to save progress:", err);
    }
  }, [isTeamLead]);

  useEffect(() => {
    if (Object.keys(answers).length > 0 || currentIndex > 0) {
      const timeoutId = setTimeout(() => saveProgress(answers, currentIndex), 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [answers, currentIndex, saveProgress]);

  const currentQuestion = questions[currentIndex];

  const canAdvance = (ans) => {
    return ans && ans.compliance !== undefined && ans.compliance !== null && ans.maturity !== undefined && ans.maturity !== null;
  };

  const handleComplianceSelect = async (val) => {
    if (isTeamLead) return;
    if (!currentQuestion) return;
    const qid = currentQuestion.question_id;
    const prev = answers[qid] || {};
    const isNa = val === 3;
    let maturity = prev.maturity;
    if (isNa) {
      maturity = 0;
    }
    
    const newAnswers = { 
      ...answers, 
      [qid]: { 
        ...prev, 
        compliance: val, 
        maturity, 
        is_na: isNa,
        evidenceChoice: prev.evidenceChoice || "no" 
      } 
    };
    setAnswers(newAnswers);
    
    if (maturity !== undefined) {
      const updated = { ...prev, compliance: val, maturity, is_na: isNa, evidenceChoice: prev.evidenceChoice || "no" };
      await submitAnswer(qid, updated, currentQuestion);
      if (updated.evidenceChoice === "no") {
        autoAdvance(3000);
      }
    }
  };

  const handleMaturitySelect = async (val) => {
    if (isTeamLead) return;
    if (!currentQuestion) return;
    const qid = currentQuestion.question_id;
    const prev = answers[qid] || {};
    const updated = { ...prev, maturity: val, evidenceChoice: prev.evidenceChoice || "no" };
    const newAnswers = { ...answers, [qid]: updated };
    setAnswers(newAnswers);
    
    if (updated.compliance !== undefined && updated.compliance !== null) {
      await submitAnswer(qid, updated, currentQuestion);
      if (updated.evidenceChoice === "no") {
        autoAdvance(3000);
      }
    }
  };

  const autoAdvance = (delay = 3000) => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
    }
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      setCurrentIndex((prevIdx) => {
        if (prevIdx < questions.length - 1) {
          return prevIdx + 1;
        } else {
          setView("review");
          return prevIdx;
        }
      });
    }, delay);
  };

  const handleEvidenceChoice = async (choice) => {
    if (isTeamLead) return;
    if (!currentQuestion) return;
    const qid = currentQuestion.question_id;
    const prev = answers[qid] || {};
    const updated = { ...prev, evidenceChoice: choice };
    const newAnswers = { ...answers, [qid]: updated };
    setAnswers(newAnswers);

    if (updated.compliance !== undefined && updated.maturity !== undefined) {
      await submitAnswer(qid, updated, currentQuestion);
    }

    if (choice === "no") {
      autoAdvance(500);
    } else {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
        autoAdvanceTimeoutRef.current = null;
      }
    }
  };

  const submitAnswer = async (qid, ans, question) => {
    if (isTeamLead) return;
    if (!ans || ans.compliance === undefined || ans.maturity === undefined) return;
    try {
      const opt = COMPLIANCE_OPTIONS.find((o) => o.val === ans.compliance);
      const mat = MATURITY_LEVELS[ans.maturity || 0];
      await submitResponseV2(assessmentId, qid, {
        answer_index: ans.compliance,
        maturity_score: ans.maturity,
        answer_text: `${opt?.label || "N/A"} | Maturity: ${mat?.label || "Non-Existent"}`,
        is_na: ans.is_na || false,
        domain: question?.domainName,
        control: question?.control,
        weight: question?.weight,
        critical: question?.critical,
      });
      generateInsight(qid, ans.maturity, ans.compliance, question);
    } catch (err) {
      console.error("Failed to submit response:", err);
      toast.addToast("Failed to save answer. Please retry.", "error");
    }
  };

  const generateInsight = (qid, maturity, compliance, question) => {
    let insight = "";
    if (compliance === 3) {
      insight = "Marked as Not Applicable. This control will be excluded from scoring.";
    } else if (maturity >= 4) {
      insight = "Strong control implementation detected. Consider documenting evidence for audit purposes.";
    } else if (maturity >= 2) {
      insight = "Moderate maturity. Focus on standardization and documentation improvements.";
    } else if (maturity > 0) {
      insight = "This is a priority gap. Develop a remediation plan within 30 days.";
    } else {
      insight = "Critical gap identified. Immediate remediation required.";
    }
    if (question?.critical && maturity < 3 && compliance !== 3) {
      insight = "⚠️ CRITICAL: This is a critical control. Prioritize remediation immediately.";
    }
    setAiInsights((prev) => ({ ...prev, [qid]: insight }));
  };

  const handleFileUpload = async (e) => {
    if (isTeamLead) return;
    const files = e.target.files;
    if (!files.length || !currentQuestion) return;
    setUploading(true);
    try {
      const res = await uploadEvidenceV2(assessmentId, currentQuestion.question_id, files);
      setEvidence((prev) => ({
        ...prev,
        [currentQuestion.question_id]: [...(prev[currentQuestion.question_id] || []), ...(res.files || [])],
      }));
      const qid = currentQuestion.question_id;
      const prev = answers[qid] || {};
      setAnswers((prevAns) => ({
        ...prevAns,
        [qid]: { ...prev, evidence: (prev.evidence || 0) + files.length },
      }));
      toast.addToast(`${files.length} file(s) uploaded successfully`, "success");
    } catch (err) {
      console.error("Upload failed:", err);
      toast.addToast("Upload failed: " + (err.message || "Unknown error"), "error");
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

  const goToQuestion = (index) => {
    setCurrentIndex(index);
    setView("questionnaire");
  };

  const finish = async () => {
    if (isTeamLead) return;
    setSaving(true);
    try {
      // Mark assessment as complete on the backend so dashboard reflects it
      await completeAssessmentV2(assessmentId);
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem("analysisDepth");
      toast.addToast("Assessment completed successfully!", "success");
      navigate(`/dashboard-v2/${assessmentId}`);
    } catch (err) {
      console.error("Failed to finalize:", err);
      toast.addToast("Error finalizing assessment. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const getScoreSummary = () => {
    const answered = Object.keys(answers).length;
    const total = questions.length;
    const answeredWithScores = Object.values(answers).filter((a) => a.maturity !== undefined && !a.is_na);
    const avgScore =
      answeredWithScores.length > 0
        ? answeredWithScores.reduce((sum, a) => sum + (a.maturity || 0), 0) / answeredWithScores.length
        : 0;
    const criticalGaps = questions.filter((q) => {
      const ans = answers[q.question_id];
      return q.critical && ans && !ans.is_na && (ans.maturity || 0) < 3;
    }).length;
    return { answered, total, avgScore, criticalGaps };
  };

  if (loading) {
    return (
      <div className="page enhanced-loading">
        <div className="loader-container">
          <div className="loader"></div>
          <h1>Loading Intelligent Assessment...</h1>
          <p>Analyzing your compliance landscape</p>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: "center" }}>
          <h1>No Questions Available</h1>
          <p>Please configure your assessment framework first.</p>
          <button className="btn btn-primary" onClick={() => navigate("/start")}>
            Start New Assessment
          </button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter(k => answers[k]?.compliance !== undefined && answers[k]?.maturity !== undefined).length;
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const summary = getScoreSummary();

  const sessionFormData = JSON.parse(sessionStorage.getItem("assessmentFormData") || "{}");

  if (view === "review") {
    return (
      <div className="page enhanced-review" style={{ justifyContent: "flex-start", paddingTop: 0, paddingLeft: 0, paddingRight: 0 }}>
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
              onClick={() => setShowExitModal(true)}
            >
              Exit
            </button>
            <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>
              <span style={{ color: "var(--text-main)", fontWeight: 900 }}>GRC tool</span>{" "}
              <span style={{ color: "var(--primary)" }}>Review</span>
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

        <div className="review-container">
          {/* Framework details subbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, padding: "0 10px" }}>
            <div>
              {isTeamLead && (
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: 20,
                    textTransform: "uppercase",
                    background: `rgba(239, 68, 68, 0.15)`,
                    color: "var(--danger)",
                    border: `1px solid rgba(239, 68, 68, 0.3)`,
                  }}
                >
                  Read-Only Review
                </span>
              )}
              <span style={{ color: "var(--text-muted)", marginLeft: isTeamLead ? 16 : 0, fontSize: "0.95rem" }}>
                <strong>{sessionFormData.orgName || "Organization"}</strong> | {sessionStorage.getItem("compliance") || "Framework"}
              </span>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: "auto", padding: "0 24px", margin: 0, height: 36 }}
              onClick={() => navigate(`/dashboard-v2/${assessmentId}`)}
            >
              Dashboard
            </button>
          </div>
          <div className="review-stats">
            <div className="stat-card">
              <div className="stat-value">{summary.answered}</div>
              <div className="stat-label">Questions Answered</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{Math.round(summary.avgScore)}</div>
              <div className="stat-label">Avg. Maturity Score</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-value">{summary.criticalGaps}</div>
              <div className="stat-label">Critical Gaps</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{Math.round((summary.answered / summary.total) * 100)}%</div>
              <div className="stat-label">Completion</div>
            </div>
          </div>

          <div className="domain-summary">
            <h3>Domain Breakdown</h3>
            <div className="domain-grid">
              {Array.from(new Set(questions.map((q) => q.domainName)))
                .slice(0, 6)
                .map((domainName) => {
                  const domainQuestions = questions.filter((q) => q.domainName === domainName);
                  const answeredCount = domainQuestions.filter(
                    (q) => answers[q.question_id]?.maturity !== undefined
                  ).length;
                  const answeredScores = domainQuestions
                    .filter((q) => answers[q.question_id]?.maturity !== undefined && !answers[q.question_id]?.is_na)
                    .map((q) => answers[q.question_id]?.maturity || 0);
                  const avgDomainScore = answeredScores.length > 0 ? answeredScores.reduce((a, b) => a + b, 0) / answeredScores.length : 0;

                  return (
                    <div
                      key={domainName}
                      className="domain-card"
                      onClick={() => {
                        const firstIndex = questions.findIndex((q) => q.domainName === domainName);
                        if (firstIndex >= 0) goToQuestion(firstIndex);
                      }}
                    >
                      <div className="domain-name">{domainName}</div>
                      <div className="domain-progress">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${(answeredCount / domainQuestions.length) * 100}%` }}
                          ></div>
                        </div>
                        <span>
                          {answeredCount}/{domainQuestions.length}
                        </span>
                      </div>
                      <div
                        className="domain-score"
                        style={{ color: MATURITY_LEVELS[Math.round(avgDomainScore)]?.color }}
                      >
                        {Math.round(avgDomainScore * 20)}%
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="review-actions">
            <button className="btn btn-outline" onClick={() => setView("questionnaire")}>
              ← Back to Questions
            </button>
            {!isTeamLead && (
              <button className="btn btn-primary" onClick={finish} disabled={saving}>
                {saving ? "Generating Report..." : "Generate Compliance Report"}
              </button>
            )}
          </div>
        </div>

        {/* Exit Confirmation Modal */}
        {showExitModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}>
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border-color)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "480px",
              width: "90%",
              boxShadow: "var(--shadow-lg)",
              textAlign: "center",
            }}>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "12px" }}>
                Are you sure you want to exit?
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "28px", lineHeight: "1.5" }}>
                Your current progress is saved, but you will need to return to complete the assessment and generate the report.
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setShowExitModal(false)}
                  style={{ flex: 1, height: "44px", padding: "0" }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowExitModal(false);
                    navigate("/start");
                  }}
                  style={{ flex: 1, height: "44px", padding: "0" }}
                >
                  Yes, Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentAnswer = answers[currentQuestion?.question_id] || {};

  return (
    <div className="page enhanced-questionnaire" style={{ justifyContent: "flex-start", paddingTop: 0, paddingLeft: 0, paddingRight: 0 }}>
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
            onClick={() => setShowExitModal(true)}
          >
            Exit
          </button>
          <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>
            <span style={{ color: "var(--text-main)", fontWeight: 900 }}>GRC tool</span>{" "}
            <span style={{ color: "var(--primary)" }}>Questionnaire</span>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 800,
                padding: "4px 10px",
                borderRadius: 20,
                textTransform: "uppercase",
                background: `rgba(14, 165, 233, 0.15)`,
                color: "var(--primary)",
                border: `1px solid rgba(14, 165, 233, 0.3)`,
              }}
            >
              Assessment Active
            </span>
            <span style={{ color: "var(--text-muted)", marginLeft: 16, fontSize: "0.95rem" }}>
              <strong>{sessionFormData.orgName || "Organization"}</strong> | {sessionStorage.getItem("compliance") || "Framework"}
            </span>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: "auto", padding: "0 24px", margin: 0, height: 36 }}
            onClick={() => navigate(`/dashboard-v2/${assessmentId}`)}
          >
            Dashboard
          </button>
        </div>

      <div className="questionnaire-body">
        <div className="questionnaire-sidebar">
          <div className="progress-section">
            <div className="progress-label">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar-large">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="progress-detail">
              Question {currentIndex + 1} of {questions.length}
            </div>
          </div>

          <div className="questions-nav-container">
            <h4>Questions Map</h4>
            <div className="navigation-dots">
              {questions.map((q, idx) => {
                const ans = answers[q.question_id];
                const isAnswered = ans && ans.compliance !== undefined && ans.maturity !== undefined;
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={q.question_id}
                    className={`nav-dot ${isCurrent ? "current" : ""} ${isAnswered ? "answered" : ""}`}
                    onClick={() => goToQuestion(idx)}
                    title={q.control}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="domain-list">
            <h4>Domains</h4>
            {Array.from(new Set(questions.map((q) => q.domainName))).map((domainName) => {
              const domainQuestions = questions.filter((q) => q.domainName === domainName);
              const answeredCount = domainQuestions.filter((q) => {
                const ans = answers[q.question_id];
                return ans && ans.compliance !== undefined && ans.maturity !== undefined;
              }).length;
              const isActive = currentQuestion?.domainName === domainName;
              return (
                <div
                  key={domainName}
                  className={`domain-item ${isActive ? "active" : ""}`}
                  onClick={() => {
                    const idx = questions.findIndex((q) => q.domainName === domainName);
                    if (idx >= 0) goToQuestion(idx);
                  }}
                >
                  <span className="domain-label">{domainName}</span>
                  <span className="domain-count">
                    {answeredCount}/{domainQuestions.length}
                  </span>
                </div>
              );
            })}
          </div>

          {isTeamLead && (
            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-color)", marginTop: "auto" }}>
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>
                Read-Only Access: Review Mode
              </div>
            </div>
          )}
        </div>

        <div className="questionnaire-main">
          <div className="question-card">
            <div className="question-header">
              <div className="domain-badge">{currentQuestion?.domainName}</div>
              <div className="control-id">{currentQuestion?.control}</div>
              {currentQuestion?.critical && <div className="critical-badge">CRITICAL</div>}
            </div>

            <h2 className="question-text">{currentQuestion?.text}</h2>

            {currentQuestion?.hint && (
              <div className="question-hint">
                <span className="hint-icon">💡</span>
                <span>{currentQuestion?.hint}</span>
              </div>
            )}

            {aiInsights[currentQuestion?.question_id] && (
              <div className="ai-insight" style={{ background: "var(--warning-bg)", borderLeft: "4px solid #f59e0b", borderRadius: 8, padding: 14, marginBottom: 20 }}>
                <span className="insight-icon" style={{ fontSize: "1.2rem" }}>🤖</span>
                <span style={{ color: "var(--warning)", fontWeight: 600, fontSize: "0.9rem", lineHeight: 1.4 }}>{aiInsights[currentQuestion?.question_id]}</span>
              </div>
            )}

            <div className="answer-section">
              {/* Compliance Status */}
              <div className="compliance-section" style={{ opacity: isTeamLead ? 0.7 : 1 }}>
                <h3>Compliance Status {isTeamLead && "(Read-Only)"}</h3>
                <div className="option-grid compliance-options">
                  {COMPLIANCE_OPTIONS.map((opt) => {
                    const isSelected = currentAnswer.compliance === opt.val;
                    return (
                      <button
                        key={opt.label}
                        className={`option-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => handleComplianceSelect(opt.val)}
                        disabled={isTeamLead}
                        style={{
                          borderColor: isSelected ? opt.color : undefined,
                          backgroundColor: isSelected ? `${opt.color}15` : undefined,
                          cursor: isTeamLead ? 'default' : 'pointer'
                        }}
                      >
                        <span
                          className="option-label"
                          style={{
                            color: isSelected ? opt.color : undefined,
                            fontWeight: isSelected ? 800 : 600,
                          }}
                        >
                          {opt.label}
                        </span>
                        <span className="option-desc" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Maturity Scale */}
              <div className="maturity-section" style={{ opacity: isTeamLead ? 0.7 : 1 }}>
                <div className="maturity-header">
                  <h3>Implementation Maturity {isTeamLead && "(Read-Only)"}</h3>
                  <span className="current-level">
                    Level {currentAnswer.maturity ?? 0}: {MATURITY_LEVELS[currentAnswer.maturity ?? 0]?.label}
                  </span>
                </div>

                <div className="maturity-scale">
                  {MATURITY_LEVELS.map((level) => {
                    const isSelected = currentAnswer.maturity === level.val;
                    return (
                      <button
                        key={level.val}
                        className={`maturity-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => handleMaturitySelect(level.val)}
                        disabled={isTeamLead}
                        style={{
                          backgroundColor: isSelected ? level.color : undefined,
                          borderColor: isSelected ? level.color : undefined,
                          color: isSelected ? "var(--text-on-dark)" : undefined,
                          cursor: isTeamLead ? 'default' : 'pointer'
                        }}
                      >
                        <span className="maturity-val">{level.val}</span>
                        <span className="maturity-label">{level.label}</span>
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Evidence Query Choice Box */}
              {currentAnswer.compliance !== undefined && currentAnswer.maturity !== undefined && (
                <div style={{
                  background: "var(--surface-hover)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "20px",
                  marginTop: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)" }}>
                    Do you want to upload evidence for this control?
                  </h4>
                  <div style={{ display: "flex", gap: "24px", marginTop: "4px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.95rem", fontWeight: 600, color: "var(--text-main)", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="evidenceChoice"
                        value="yes"
                        checked={currentAnswer.evidenceChoice === "yes"}
                        onChange={() => handleEvidenceChoice("yes")}
                        style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
                      />
                      Yes
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.95rem", fontWeight: 600, color: "var(--text-main)", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="evidenceChoice"
                        value="no"
                        checked={currentAnswer.evidenceChoice === "no" || currentAnswer.evidenceChoice === undefined}
                        onChange={() => handleEvidenceChoice("no")}
                        style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
                      />
                      No
                    </label>
                  </div>
                </div>
              )}

              {/* Evidence Section (conditional on evidenceChoice === 'yes') */}
              {currentAnswer.evidenceChoice === "yes" && (
                <div className="evidence-section" style={{ marginTop: "24px" }}>
                  <h3>Evidence & Documentation</h3>
                  
                  {!isTeamLead && (
                    <div className="evidence-upload">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        id="evidence-upload"
                        disabled={uploading}
                      />
                      <label htmlFor="evidence-upload" className="upload-label">
                        <span className="upload-icon">📎</span>
                        <span>{uploading ? "Uploading..." : "Attach Evidence"}</span>
                        <span className="upload-hint">PDF, DOCX, PNG, JPG (Max 10MB)</span>
                      </label>
                    </div>
                  )}

                  {evidence[currentQuestion?.question_id] && evidence[currentQuestion?.question_id].length > 0 && (
                    <div className="evidence-list">
                      {evidence[currentQuestion?.question_id].map((file, i) => (
                        <div key={i} className="evidence-item">
                          <span className="evidence-icon">✓</span>
                          <span className="evidence-name">{file.original_name || file.originalname}</span>
                          <span className="evidence-size">
                            {Math.round((file.file_size || file.size) / 1024)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="question-navigation" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", marginTop: 24, borderTop: "1px solid var(--border-color)" }}>
              <button className="btn btn-outline" onClick={prev} disabled={currentIndex === 0}
                style={{ padding: "10px 20px", fontSize: "0.85rem", fontWeight: 600, borderRadius: 8, opacity: currentIndex === 0 ? 0.4 : 1, width: "auto" }}>
                ← Previous
              </button>
              
              {((currentAnswer.compliance !== undefined && currentAnswer.maturity !== undefined && currentAnswer.evidenceChoice === "yes") || 
                (currentAnswer.compliance !== undefined && currentAnswer.maturity !== undefined && currentAnswer.evidenceChoice === "no")) && (
                <button 
                  className="btn btn-primary" 
                  onClick={next}
                  style={{ padding: "10px 20px", fontSize: "0.85rem", fontWeight: 600, borderRadius: 8, width: "auto", height: "auto" }}
                >
                  {currentIndex === questions.length - 1 ? "Finish Assessment →" : "Next →"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            padding: "32px",
            maxWidth: "480px",
            width: "90%",
            boxShadow: "var(--shadow-lg)",
            textAlign: "center",
          }}>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "12px" }}>
              Are you sure you want to exit?
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "28px", lineHeight: "1.5" }}>
              Your current progress is saved, but you will need to return to complete the assessment and generate the report.
            </p>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowExitModal(false)}
                style={{ flex: 1, height: "44px", padding: "0" }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowExitModal(false);
                  navigate("/start");
                }}
                style={{ flex: 1, height: "44px", padding: "0" }}
              >
                Yes, Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
