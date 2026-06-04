import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setupOrganization, getCurrentUser } from "../api";

const INDUSTRIES = [
  "Financial Services",
  "Healthcare",
  "Retail/E-commerce",
  "Technology/SaaS",
  "Manufacturing",
  "Public Sector",
  "Education",
  "Energy & Utilities",
];

const SIZES = [
  "Small (1-50)",
  "Medium (51-200)",
  "Large (201-500)",
  "Enterprise (500+)",
];

const REGIONS = [
  "India",
  "European Union",
  "United States",
  "United Kingdom",
  "Southeast Asia",
  "Middle East & Africa",
  "Global/Multi-region",
];

const CLOUD_STORAGE_USAGE = ["Less", "Medium", "High"];

export default function Assessment() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isTeamMember = user?.role === 'team_member';
  const type = sessionStorage.getItem("assessmentType") || "quick";
  const isFullLike = ["full", "internal", "vendor", "risk", "gap"].includes(type);

  const [form, setForm] = useState({
    orgName: user?.orgName || "",
    industry: "",
    orgSize: "",
    region: "",
    cloudUsage: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isTeamMember) return;
    setLoading(true);
    setError("");
    
    try {
      const typeMap = {
        "internal": "internal_audit",
        "vendor": "vendor_assessment",
        "risk": "risk_assessment",
        "gap": "gap_assessment",
        "full": "compliance_assessment",
        "quick": "compliance_assessment"
      };

      const result = await setupOrganization({
        name: form.orgName,
        industry: form.industry,
        region: form.region,
        employee_range: form.orgSize,
        frameworks: ["ISO/IEC 27001:2022"], // Default setup placeholder, custom configured in next steps
        analysis_depth: isFullLike ? "comprehensive" : "quick", // Satisfies backend validation enum
        assessment_type: typeMap[type] || "compliance_assessment"
      });

      // Save form details in sessionStorage
      sessionStorage.setItem("assessmentFormData", JSON.stringify(form));
      
      // Store dynamic assessmentId returned by the setup response
      if (result && (result.id || result.assessment_id)) {
        sessionStorage.setItem("assessmentId", result.id || result.assessment_id);
      }

      navigate("/compliance");
    } catch (err) {
      setError(err.message || "Failed to save organization profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ background: "var(--bg-color)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      
      {/* Back Navigation Bar */}
      <div style={{ maxWidth: 520, width: "100%", marginBottom: 12, display: "flex", justifyContent: "flex-start" }}>
        <button 
          type="button" 
          onClick={() => navigate(-1)} 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "6px", 
            background: "none", 
            border: "1px solid var(--border-color)", 
            padding: "8px 16px", 
            borderRadius: "8px", 
            color: "var(--text-main)", 
            cursor: "pointer", 
            fontWeight: 600,
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "none"}
        >
          ← Back
        </button>
      </div>

      <div className="card card-narrow" style={{ border: "1px solid var(--cyber-border)", background: "var(--surface)" }}>
        <h1 style={{ color: "var(--text-main)" }}>Organization Profile</h1>
        <p className="subtitle">Tell us about your organization to customize the assessment.</p>

        {error && (
          <div style={{ padding: 12, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--danger)", borderRadius: 8, marginBottom: 20, fontSize: "0.85rem", fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Organization Name</label>
            <input
              style={{ background: "var(--surface)", color: "var(--text-main)", border: "1px solid var(--border-color)", width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", outline: "none", boxSizing: "border-box" }}
              type="text"
              placeholder="e.g. Acme Corp"
              value={form.orgName}
              onChange={(e) => setForm({ ...form, orgName: e.target.value })}
              required
              disabled={isTeamMember}
            />
          </div>

          <div className="field">
            <label style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Industry</label>
            <select
              style={{ background: "var(--surface)", color: "var(--text-main)", border: "1px solid var(--border-color)", width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", outline: "none", boxSizing: "border-box" }}
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              required
              disabled={isTeamMember}
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Organization Size</label>
            <select
              style={{ background: "var(--surface)", color: "var(--text-main)", border: "1px solid var(--border-color)", width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", outline: "none", boxSizing: "border-box" }}
              value={form.orgSize}
              onChange={(e) => setForm({ ...form, orgSize: e.target.value })}
              required
              disabled={isTeamMember}
            >
              <option value="">Select size</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Region</label>
            <select
              style={{ background: "var(--surface)", color: "var(--text-main)", border: "1px solid var(--border-color)", width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", outline: "none", boxSizing: "border-box" }}
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              required
              disabled={isTeamMember}
            >
              <option value="">Select region</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Cloud Usage Section */}
          <div className="field">
            <label style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Cloud Usage</label>
            <select
              style={{ background: "var(--surface)", color: "var(--text-main)", border: "1px solid var(--border-color)", width: "100%", height: "40px", padding: "0 12px", borderRadius: "8px", outline: "none", boxSizing: "border-box" }}
              value={form.cloudUsage}
              onChange={(e) => setForm({ ...form, cloudUsage: e.target.value })}
              required
              disabled={isTeamMember}
            >
              <option value="">Select cloud usage</option>
              {CLOUD_STORAGE_USAGE.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {isTeamMember ? (
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', marginTop: 24, textAlign: 'center', color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 600 }}>
              Read-Only Access: You cannot modify organization settings.
            </div>
          ) : (
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ height: 54, fontSize: "1.05rem", marginTop: 24, width: "100%" }}>
              {loading ? "Processing..." : isFullLike ? "Continue to Framework Selection" : "Continue to Frameworks"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
