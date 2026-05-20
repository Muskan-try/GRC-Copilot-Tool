import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAssessmentV2 } from "../api";
import { useToast } from "../components/Toast";

// Map frontend sidebar types to backend assessment_type values
const TYPE_MAP = {
  quick: "compliance_assessment",
  full: "compliance_assessment",
  gap: "gap_assessment",
  risk: "risk_assessment",
  internal: "internal_audit",
  vendor: "vendor_assessment",
};

// Framework IDs must match MongoDB QuestionBank.framework names exactly
const CATEGORIES = [
  {
    title: "Data Protection & Privacy",
    frameworks: [
      { id: "GDPR", desc: "EU data protection regulation" },
      { id: "DPDPA (India)", desc: "India Digital Personal Data Protection Act" },
      { id: "HIPAA Security Rule", desc: "US healthcare data privacy and security" },
    ],
  },
  {
    title: "Information Security Standards",
    frameworks: [
      { id: "ISO/IEC 27001:2022", desc: "Information security management systems" },
      { id: "SOC 2 Trust Services Criteria", desc: "Service organization trust and security controls" },
    ],
  },
  {
    title: "Industry-Specific Compliance",
    frameworks: [
      { id: "PCI DSS v4.0", desc: "Payment card industry data security" },
    ],
  },
  {
    title: "Cybersecurity Frameworks",
    frameworks: [
      { id: "NIST CSF 2.0", desc: "NIST Cybersecurity Framework" },
      { id: "CIS Controls v8", desc: "Center for Internet Security safeguards" },
    ],
  },
];

export default function Compliance() {
  const navigate = useNavigate();
  const toast = useToast();
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const type = sessionStorage.getItem("assessmentType") || "quick";
  const isFullLike = ["full", "internal", "vendor", "risk", "gap"].includes(type);

  const toggleFramework = (id) => {
    if (!isFullLike) {
      selectFramework(id);
      return;
    }
    // Set as single selection
    setSelected([id]);
  };

  const selectFramework = async (id) => {
    const formData = JSON.parse(sessionStorage.getItem("assessmentFormData") || "{}");
    const scope = JSON.parse(sessionStorage.getItem("assessmentScope") || "{}");
    const backendType = TYPE_MAP[type] || "compliance_assessment";

    try {
      setLoading(true);
      const result = await createAssessmentV2({
        organization_name: formData.orgName || "My Organization",
        selected_frameworks: [id],
        scope: scope,
        analysis_depth: "quick",
        assessment_type: backendType,
      });

      sessionStorage.setItem("compliance", id);
      sessionStorage.setItem("complianceAll", JSON.stringify([id]));
      sessionStorage.setItem("assessmentId", result.id);
      navigate("/level-of-assessment");
    } catch (err) {
      console.error("Assessment creation failed:", err);
      toast.addToast("Failed to start assessment: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFullAssessmentStart = async () => {
    if (selected.length === 0) return;
    const formData = JSON.parse(sessionStorage.getItem("assessmentFormData") || "{}");
    const scope = JSON.parse(sessionStorage.getItem("assessmentScope") || "{}");
    const backendType = TYPE_MAP[type] || "compliance_assessment";

    try {
      setLoading(true);
      const result = await createAssessmentV2({
        organization_name: formData.orgName || "My Organization",
        selected_frameworks: selected,
        scope: scope,
        analysis_depth: "comprehensive",
        assessment_type: backendType,
      });

      sessionStorage.setItem("assessmentId", result.id);
      sessionStorage.setItem("complianceAll", JSON.stringify(selected));
      sessionStorage.setItem("compliance", selected[0]);
      navigate("/level-of-assessment");
    } catch (err) {
      console.error("V2 Assessment creation failed:", err);
      toast.addToast("Failed to start full assessment: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ background: "var(--bg-color)", alignItems: "center", display: "flex", flexDirection: "column" }}>
      <div className="page-header" style={{ maxWidth: 800, width: "100%", marginBottom: 20 }}>
        <button type="button" className="btn btn-back" onClick={() => navigate(-1)}>Back</button>
      </div>

      <div className="card card-wide" style={{ padding: 48, border: "1px solid var(--cyber-border)" }}>
        <div style={{ marginBottom: 40, borderBottom: "1px solid var(--border-color)", paddingBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: "var(--text-main)" }}>Select Framework</h1>
            <p className="subtitle" style={{ margin: 0 }}>
              {isFullLike ? "Choose the primary standard for your comprehensive audit." : "Choose the regulatory standard for your quick assessment."}
            </p>
          </div>
          {isFullLike && (
            <button 
              className="btn btn-primary" 
              disabled={selected.length === 0 || loading} 
              onClick={handleFullAssessmentStart}
              style={{ width: 'auto', padding: '0 32px' }}
            >
              {loading ? "Starting..." : "Start Full Assessment"}
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {CATEGORIES.map((cat) => (
            <section key={cat.title}>
              <h2 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--primary)", marginBottom: 20, fontWeight: 800 }}>
                {cat.title}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                {cat.frameworks.map((fw) => {
                  const isSelected = selected.includes(fw.id);
                  return (
                    <button 
                      key={fw.id} 
                      type="button" 
                      className={`compliance-card ${isSelected ? 'active' : ''}`} 
                      onClick={() => toggleFramework(fw.id)}
                      style={{ 
                        height: "100%", 
                        display: "flex", 
                        flexDirection: "column",
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(var(--primary-rgb), 0.05)' : 'white',
                        textAlign: 'left'
                      }}
                    >
                      <div className="compliance-card-name">{fw.id}</div>
                      <div className="compliance-card-desc">{fw.desc}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
