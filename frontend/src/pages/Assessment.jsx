import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setupOrganization, getCurrentUser } from "../api";

const INDUSTRIES = [
  "Financial Services",
  "Healthcare",
  "Retail/E-commerce",
  "Technology/Saas",
  "Manufacturing",
  "Government/Public Sector",
  "Education",
  "Energy/Utilities",
  "Telecommunication",
  "Other",
];

const ORG_SIZES = [
  "Small (1-50)",
  "Medium (51-150)",
  "Large (151-500)",
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

  const handleNext = async () => {
    if (!form.orgName.trim()) {
      setError("Please enter your organisation name.");
      return;
    }
    if (!form.cloudUsage) {
      setError("Please select cloud storage usage.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Store assessment details for later steps
      sessionStorage.setItem("assessmentFormData", JSON.stringify(form));
      // Clear old questionnaire data
      sessionStorage.removeItem("answers");
      sessionStorage.removeItem("assessmentId");
      
      if (isFullLike) {
        navigate("/scope");
      } else {
        navigate("/compliance");
      }
    } catch (err) {
      setError(err.message || "Failed to setup assessment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ background: "var(--bg-color)" }}>
      <div className="page-header" style={{ maxWidth: 600, width: "100%", marginBottom: 20 }}>
        <button className="btn btn-back" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      <div className="card" style={{ maxWidth: 600, padding: 48, border: "1px solid var(--cyber-border)" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ 
            width: 56, height: 56, background: "var(--primary-light)", borderRadius: 12, 
            display: "inline-flex", alignItems: "center", justifyContent: "center", 
            marginBottom: 20, color: "var(--primary)", fontSize: "1.5rem"
          }}>🏢</div>
          <h1 style={{ color: "var(--text-main)" }}>Organization Profile</h1>
          <p className="subtitle" style={{ margin: 0 }}>
            Tell us about your organization to tailor your assessment.
          </p>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "var(--danger-bg)", border: "1px solid #fee2e2", borderRadius: 12, marginBottom: 20, fontSize: "0.88rem", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
          <div className="field">
            <label>Organisation Name</label>
            <input
              type="text"
              placeholder="Acme Corp"
              value={form.orgName}
              onChange={(e) => setForm({ ...form, orgName: e.target.value })}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="field">
              <label>Select Industry</label>
              <select
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Organization Size</label>
              <select
                value={form.orgSize}
                onChange={(e) => setForm({ ...form, orgSize: e.target.value })}
              >
                <option value="">Select size</option>
                {ORG_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="field">
              <label>Region/Location</label>
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              >
                <option value="">Select region</option>
                {REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Cloud Storage Use</label>
              <select
                value={form.cloudUsage}
                onChange={(e) => setForm({ ...form, cloudUsage: e.target.value })}
              >
                <option value="">Select usage</option>
                {CLOUD_STORAGE_USAGE.map((usage) => (
                  <option key={usage} value={usage}>
                    {usage}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleNext} disabled={loading} style={{ height: 54, fontSize: "1.05rem", marginTop: 24 }}>
          {loading ? "Processing..." : isFullLike ? "Continue to Scope Definition" : "Continue to Frameworks"}
        </button>
      </div>
    </div>
  );
}
