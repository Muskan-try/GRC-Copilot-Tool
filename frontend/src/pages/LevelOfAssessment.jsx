import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateAssessmentConfig } from "../api";
import { useToast } from "../components/Toast";

const QUICK_ASSESSMENT_TYPES = [
  {
    id: "gap_assessment",
    title: "Gap Assessment",
    desc: "Identify deficiencies between current and required control state",
    icon: "📊",
    color: "var(--primary)",
  },
  {
    id: "risk_assessment",
    title: "Risk Assessment",
    desc: "Identify, analyze, and evaluate information security risks",
    icon: "⚠️",
    color: "var(--danger)",
  },
  {
    id: "internal_audit",
    title: "Internal Audit",
    desc: "Independent evaluation of internal controls and compliance",
    icon: "🔍",
    color: "var(--accent)",
  },
  {
    id: "vendor_assessment",
    title: "Vendor Assessment",
    desc: "Evaluate third-party security and compliance posture",
    icon: "🤝",
    color: "var(--primary)",
  },
];

const FULL_ASSESSMENT_TYPES = [
  {
    id: "vendor_assessment",
    title: "Vendor Assessment",
    desc: "Evaluate third-party security and compliance posture",
    icon: "🤝",
    color: "var(--primary)",
  },
  {
    id: "internal_audit",
    title: "Internal Audit",
    desc: "Independent evaluation of internal controls and compliance",
    icon: "🔍",
    color: "var(--accent)",
  },
];

const DEPTH_LEVELS = [
  {
    id: "quick",
    title: "Quick Scan",
    desc: "Fast assessment covering critical controls only (10-15 questions)",
    icon: "⚡",
    time: "10-15 min",
    questions: "10-15 questions",
    color: "var(--success)",
  },
  {
    id: "standard",
    title: "Standard Assessment",
    desc: "Balanced review of essential security domains and controls (25-30 questions)",
    icon: "📊",
    time: "30-45 min",
    questions: "25-30 questions",
    color: "var(--primary)",
  },
  {
    id: "comprehensive",
    title: "Comprehensive",
    desc: "In-depth evaluation for complete compliance picture (40-60 questions)",
    icon: "🔍",
    time: "60-90 min",
    questions: "40-60 questions",
    color: "var(--primary)",
  },
  {
    id: "full",
    title: "Full Control Analysis",
    desc: "Complete analysis of ALL controls — nothing left out (60+ questions)",
    icon: "🛡️",
    time: "2-5 hours",
    questions: "ALL questions",
    color: "var(--danger)",
  },
];

// Map frontend sidebar type (from sessionStorage) to backend assessment_type
const FRONTEND_TO_BACKEND_TYPE = {
  quick: "gap_assessment",
  full: "internal_audit",
  gap: "gap_assessment",
  risk: "risk_assessment",
  internal: "internal_audit",
  vendor: "vendor_assessment",
};

export default function LevelOfAssessment() {
  const navigate = useNavigate();
  const toast = useToast();
  
  const assessmentMode = sessionStorage.getItem("assessmentType") || "quick"; // 'full' or 'quick'
  const isFullFlow = assessmentMode === "full";

  function getInitialType() {
    return FRONTEND_TO_BACKEND_TYPE[assessmentMode] || (isFullFlow ? "internal_audit" : "gap_assessment");
  }

  const [selectedType, setSelectedType] = useState(getInitialType);
  const [selectedDepth, setSelectedDepth] = useState("standard");
  const [updating, setUpdating] = useState(false);

  const assessmentTypes = isFullFlow ? FULL_ASSESSMENT_TYPES : QUICK_ASSESSMENT_TYPES;

  const handleNext = async () => {
    const assessmentId = sessionStorage.getItem("assessmentId");

    if (!assessmentId) {
      toast.addToast("Assessment ID not found. Please start over.", "error");
      navigate("/start");
      return;
    }

    setUpdating(true);
    try {
      // For Full flow, we force 'comprehensive' depth
      const depthToSubmit = isFullFlow ? "comprehensive" : selectedDepth;
      
      await updateAssessmentConfig(assessmentId, {
        analysis_depth: depthToSubmit,
        assessment_type: selectedType,
      });

      sessionStorage.setItem("analysisDepth", depthToSubmit);
      sessionStorage.setItem("assessmentType", selectedType);
      navigate(`/policy-upload/${assessmentId}`);
    } catch (err) {
      console.error("Failed to update assessment config:", err);
      toast.addToast("Failed to update assessment: " + (err.message || "Unknown error"), "error");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="page" style={{ background: "var(--bg-color)", alignItems: "center", display: "flex", flexDirection: "column" }}>
      <div className="page-header" style={{ maxWidth: 800, width: "100%", marginBottom: 20 }}>
        <button type="button" className="btn btn-back" onClick={() => navigate(-1)}>Back</button>
      </div>

      <div className="card" style={{ maxWidth: 800, padding: 48, border: "1px solid var(--cyber-border)" }}>
        <div style={{ marginBottom: 32, borderBottom: "1px solid var(--border-color)", paddingBottom: 24 }}>
          <h1 style={{ color: "var(--text-main)" }}>
            {isFullFlow ? "Full Assessment Configuration" : "Quick Assessment Configuration"}
          </h1>
          <p className="subtitle" style={{ margin: 0 }}>
            Choose the evaluation parameters. This determines question selection, scoring methodology, and report focus.
          </p>
        </div>

        {/* Assessment Type Selection */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: "1.1rem", color: "var(--text-main)", marginBottom: 16, fontWeight: 700 }}>
            1. Assessment Type
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {assessmentTypes.map((type) => (
              <div
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                style={{
                  padding: "16px 20px",
                  borderRadius: 12,
                  border: "2px solid " + (selectedType === type.id ? type.color : "var(--border-color)"),
                  background: selectedType === type.id ? `${type.color}08` : "var(--surface)",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: selectedType === type.id ? "scale(1.02)" : "scale(1)",
                  boxShadow: selectedType === type.id ? `0 4px 16px ${type.color}20` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: "1.4rem" }}>{type.icon}</span>
                  <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-main)" }}>
                    {type.title}
                  </div>
                  {selectedType === type.id && (
                    <div style={{
                      marginLeft: "auto",
                      width: 20, height: 20,
                      background: type.color,
                      borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: 900, fontSize: "0.7rem"
                    }}>✓</div>
                  )}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  {type.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Depth Selection - ONLY FOR QUICK FLOW */}
        {!isFullFlow && (
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: "1.1rem", color: "var(--text-main)", marginBottom: 16, fontWeight: 700 }}>
              2. Assessment Depth
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {DEPTH_LEVELS.map((level) => (
                <div
                  key={level.id}
                  onClick={() => setSelectedDepth(level.id)}
                  style={{
                    padding: "20px 24px",
                    borderRadius: 16,
                    border: "2px solid " + (selectedDepth === level.id ? level.color : "var(--border-color)"),
                    background: selectedDepth === level.id ? `${level.color}08` : "var(--surface)",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: selectedDepth === level.id ? "scale(1.02)" : "scale(1)",
                    boxShadow: selectedDepth === level.id ? `0 8px 24px ${level.color}20` : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{
                        width: 44, height: 44,
                        background: `${level.color}15`,
                        borderRadius: 12,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.3rem"
                      }}>
                        {level.icon}
                      </div>
                      <div>
                        <h3 style={{ fontSize: "1.05rem", color: "var(--text-main)", marginBottom: 3, fontWeight: 800 }}>{level.title}</h3>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>{level.desc}</p>
                      </div>
                    </div>
                    {selectedDepth === level.id && (
                      <div style={{
                        width: 24, height: 24,
                        background: level.color,
                        borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", fontWeight: 900, fontSize: "0.8rem"
                      }}>✓</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 24, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>⏱️</span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{level.time}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>📝</span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{level.questions}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isFullFlow && (
          <div style={{
            padding: 24,
            background: "var(--surface-hover)",
            borderRadius: 12,
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 20
          }}>
            <div style={{ fontSize: "2rem" }}>🛡️</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-main)", marginBottom: 4 }}>
                Comprehensive Control Analysis
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Full assessments are automatically configured for in-depth evaluation to ensure exhaustive framework coverage and CISO-ready output.
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{
            padding: "14px 20px",
            background: "var(--gray-100)",
            borderRadius: 10,
            fontSize: "0.95rem",
            color: "var(--gray-600)",
            flex: 1,
          }}>
            <strong>Selected:</strong> {assessmentTypes.find(t => t.id === selectedType)?.title} {!isFullFlow && `+ ${DEPTH_LEVELS.find(d => d.id === selectedDepth)?.title}`} {isFullFlow && "(Comprehensive)"}
          </div>
          <button className="btn btn-primary" onClick={handleNext} disabled={updating} style={{ height: 54, fontSize: "1.05rem", padding: "0 32px" }}>
            {updating ? "Updating..." : "Start Assessment →"}
          </button>
        </div>
      </div>
    </div>
  );
}
