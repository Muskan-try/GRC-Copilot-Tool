import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addAssessmentFrameworks } from "../api";

export default function AuditTypeSelection() {
  const navigate = useNavigate();
  const assessmentId = sessionStorage.getItem("assessmentId");
  const [loading, setLoading] = useState(false);

  const handleSelect = async (type) => {
    const frameworkName = type === "internal" ? "Internal Audit" : "Vendor Assessment";
    
    try {
      setLoading(true);
      // Link the audit framework to the assessment in the backend
      // This ensures that answers to these questions are included in the compliance score
      await addAssessmentFrameworks(assessmentId, [frameworkName]);
      
      sessionStorage.setItem("auditMode", type);
      sessionStorage.setItem("auditFramework", frameworkName);
      navigate("/questionnaire-full");
    } catch (err) {
      console.error("Failed to link audit framework:", err);
      // Even if it fails, we try to proceed, though scoring might be affected
      sessionStorage.setItem("auditMode", type);
      sessionStorage.setItem("auditFramework", frameworkName);
      navigate("/questionnaire-full");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page"><h1>Configuring Audit...</h1></div>;

  return (
    <div className="page" style={{ background: "var(--bg-color)" }}>
      <div className="page-header" style={{ maxWidth: 800, width: "100%", marginBottom: 20 }}>
        <button className="btn btn-back" onClick={() => navigate(-1)}>Back</button>
      </div>

      <div className="card" style={{ maxWidth: 600, padding: 48, border: "1px solid var(--cyber-border)" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ 
            width: 56, height: 56, background: "var(--primary-light)", borderRadius: 12, 
            display: "inline-flex", alignItems: "center", justifyContent: "center", 
            marginBottom: 20, color: "var(--primary)", fontSize: "1.5rem"
          }}>📋</div>
          <h1 style={{ color: "var(--text-main)" }}>Audit Type</h1>
          <p className="subtitle">Choose whether you want to perform an Internal Audit or a Vendor Assessment.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
          <button 
            className="card" 
            onClick={() => handleSelect("internal")}
            style={{ 
              padding: 32, textAlign: "left", cursor: "pointer", 
              border: "1px solid var(--border-color)", transition: "all 0.2s",
              background: "var(--surface)"
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-color)"}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: 12 }}>🏢</div>
            <h3 style={{ margin: "0 0 8px 0", color: "var(--text-main)" }}>Internal Audit</h3>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Conduct a self-assessment to ensure internal policies and controls are operating effectively within your organization.
            </p>
          </button>

          <button 
            className="card" 
            onClick={() => handleSelect("vendor")}
            style={{ 
              padding: 32, textAlign: "left", cursor: "pointer", 
              border: "1px solid var(--border-color)", transition: "all 0.2s",
              background: "var(--surface)"
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-color)"}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: 12 }}>🤝</div>
            <h3 style={{ margin: "0 0 8px 0", color: "var(--text-main)" }}>Vendor Assessment</h3>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Evaluate the security posture of third-party partners and supply chain members to ensure they meet your standards.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
