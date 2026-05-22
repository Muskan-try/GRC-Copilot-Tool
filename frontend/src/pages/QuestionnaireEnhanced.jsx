import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getQuestionsV2, submitResponseV2, uploadEvidenceV2, completeAssessmentV2 } from "../api";
import { useToast } from "../components/Toast";

const STORAGE_KEY = "enhanced_questionnaire_progress";

const MATURITY_LEVELS = [
  { val: 0, label: "Non-Existent", desc: "No recognizable process exists", color: "#ef4444" },
  { val: 1, label: "Initial", desc: "Ad-hoc and disorganized processes", color: "#f87171" },
  { val: 2, label: "Developing", desc: "Basic processes emerging but informal", color: "#fb923c" },
  { val: 3, label: "Defined", desc: "Processes documented and standardized", color: "#fcd34d" },
  { val: 4, label: "Managed", desc: "Measured, controlled, and continuously improved", color: "#a3e635" },
  { val: 5, label: "Optimized", desc: "Automated best practices with metrics-driven improvement", color: "#22c55e" },
];

const COMPLIANCE_OPTIONS = [
  { val: 0, label: "Yes", desc: "Fully meets the control requirement", color: "#22c55e" },
  { val: 1, label: "Partial", desc: "Partially implements the control", color: "#f59e0b" },
  { val: 2, label: "No", desc: "Does not meet the control requirement", color: "#ef4444" },
  { val: 3, label: "N/A", desc: "Control does not apply", color: "#94a3b8" },
];

export default function QuestionnaireEnhanced() {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
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
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ answers: currentAnswers, currentIndex: index, timestamp: Date.now() })
      );
    } catch (err) {
      console.error("Failed to save progress:", err);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(answers).length > 0 || currentIndex > 0) {
      const timeoutId = setTimeout(() => saveProgress(answers, currentIndex), 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [answers, currentIndex, saveProgress]);

  const currentQuestion = questions[currentIndex];

  const handleComplianceSelect = async (val) => {
    if (!currentQuestion) return;
    const qid = currentQuestion.question_id;
    const prev = answers[qid] || {};
    const newAnswers = { ...answers, [qid]: { ...prev, compliance: val, is_na: val === 3 } };
    setAnswers(newAnswers);
    await submitAnswer(qid, newAnswers[qid], currentQuestion);
  };

  const handleMaturitySelect = async (val) => {
    if (!currentQuestion) return;
    const qid = currentQuestion.question_id;
    const prev = answers[qid] || {};
    const newAnswers = { ...answers, [qid]: { ...prev, maturity: val } };
    setAnswers(newAnswers);
    await submitAnswer(qid, newAnswers[qid], currentQuestion);
  };

  const submitAnswer = async (qid, ans, question) => {
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

  if (view === "review") {
    return (
      <div className="page enhanced-review">
        <div className="review-container">
          <div className="review-header">
            <h1>Assessment Review</h1>
            <p>Review your responses before generating the compliance report</p>
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
            <button className="btn btn-primary" onClick={finish} disabled={saving}>
              {saving ? "Generating Report..." : "Generate Compliance Report"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentAnswer = answers[currentQuestion?.question_id] || {};

  return (
    <div className="page enhanced-questionnaire">
      <div className="questionnaire-sidebar">
        <div className="sidebar-header">
          <button className="btn btn-back" onClick={() => navigate("/start")}>
            ← Exit
          </button>
        </div>

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
            <div className="ai-insight">
              <span className="insight-icon">🤖</span>
              <span>{aiInsights[currentQuestion?.question_id]}</span>
            </div>
          )}

          <div className="answer-section">
            {/* Compliance Status */}
            <div className="compliance-section">
              <h3>Compliance Status</h3>
              <div className="option-grid compliance-options">
                {COMPLIANCE_OPTIONS.map((opt) => {
                  const isSelected = currentAnswer.compliance === opt.val;
                  return (
                    <button
                      key={opt.label}
                      className={`option-btn ${isSelected ? "selected" : ""}`}
                      onClick={() => handleComplianceSelect(opt.val)}
                      style={{
                        borderColor: isSelected ? opt.color : undefined,
                        backgroundColor: isSelected ? `${opt.color}15` : undefined,
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
                      <span className="option-desc" style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Maturity Scale */}
            <div className="maturity-section">
              <div className="maturity-header">
                <h3>Implementation Maturity</h3>
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
                      style={{
                        backgroundColor: isSelected ? level.color : undefined,
                        borderColor: isSelected ? level.color : undefined,
                        color: isSelected ? "#fff" : undefined,
                      }}
                    >
                      <span className="maturity-val">{level.val}</span>
                      <span className="maturity-label">{level.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="maturity-desc">{MATURITY_LEVELS[currentAnswer.maturity ?? 0]?.desc}</div>
            </div>

            {/* Evidence Upload */}
            <div className="evidence-section">
              <h3>Evidence & Documentation</h3>
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
          </div>

          <div className="question-navigation">
            <button className="btn btn-outline" onClick={prev} disabled={currentIndex === 0}>
              ← Previous
            </button>

            <div className="nav-info">
              <span className="weight-badge">Weight: {currentQuestion?.weight}x</span>
              {currentQuestion?.critical && <span className="critical-indicator">Critical Control</span>}
            </div>

            <button className="btn btn-primary" onClick={next}>
              {currentIndex === questions.length - 1 ? "Review All →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
