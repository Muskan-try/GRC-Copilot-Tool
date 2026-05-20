import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ScopeDefinition() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState(["IT", "HR", "Finance", "Legal"]);
  const [newDept, setNewDept] = useState("");
  const [assets, setAssets] = useState(["Customer Data", "Source Code", "Financial Records"]);
  const [newAsset, setNewAsset] = useState("");

  const addDept = () => {
    if (newDept.trim() && !departments.includes(newDept)) {
      setDepartments([...departments, newDept.trim()]);
      setNewDept("");
    }
  };

  const addAsset = () => {
    if (newAsset.trim() && !assets.includes(newAsset)) {
      setAssets([...assets, newAsset.trim()]);
      setNewAsset("");
    }
  };

  const removeDept = (d) => setDepartments(departments.filter(item => item !== d));
  const removeAsset = (a) => setAssets(assets.filter(item => item !== a));

  const handleNext = () => {
    const scope = { departments, assets };
    sessionStorage.setItem("assessmentScope", JSON.stringify(scope));
    navigate("/compliance");
  };

  return (
    <div className="page" style={{ background: "var(--bg-color)" }}>
      <div className="page-header" style={{ maxWidth: 800, width: "100%", marginBottom: 20 }}>
        <button className="btn btn-back" onClick={() => navigate(-1)}>Back</button>
      </div>

      <div className="card card-wide" style={{ maxWidth: 800, padding: 48, border: "1px solid var(--cyber-border)" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ 
            width: 56, height: 56, background: "var(--primary-light)", borderRadius: 12, 
            display: "inline-flex", alignItems: "center", justifyContent: "center", 
            marginBottom: 20, color: "var(--primary)", fontSize: "1.5rem"
          }}>🎯</div>
          <h1 style={{ color: "var(--text-main)" }}>Scope Definition</h1>
          <p className="subtitle">Identify the departments and critical assets in scope for this assessment.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          {/* DEPARTMENTS */}
          <div className="field">
            <label>Departments in Scope</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input 
                type="text" 
                value={newDept} 
                onChange={(e) => setNewDept(e.target.value)}
                placeholder="Add department (e.g., Marketing)" 
              />
              <button className="btn btn-primary" style={{ width: "auto", padding: "0 16px" }} onClick={addDept}>+</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {departments.map(d => (
                <span key={d} style={{ 
                  padding: "6px 12px", borderRadius: 20, background: "var(--surface-hover)", 
                  border: "1px solid var(--border-color)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 8 
                }}>
                  {d} <button onClick={() => removeDept(d)} style={{ border: "none", background: "none", cursor: "pointer", color: "#999" }}>&times;</button>
                </span>
              ))}
            </div>
          </div>

          {/* ASSETS */}
          <div className="field">
            <label>Critical Assets</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input 
                type="text" 
                value={newAsset} 
                onChange={(e) => setNewAsset(e.target.value)}
                placeholder="Add asset (e.g., Servers)" 
              />
              <button className="btn btn-primary" style={{ width: "auto", padding: "0 16px" }} onClick={addAsset}>+</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {assets.map(a => (
                <span key={a} style={{ 
                  padding: "6px 12px", borderRadius: 20, background: "var(--surface-hover)", 
                  border: "1px solid var(--border-color)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 8 
                }}>
                  {a} <button onClick={() => removeAsset(a)} style={{ border: "none", background: "none", cursor: "pointer", color: "#999" }}>&times;</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleNext} style={{ height: 54, fontSize: "1.05rem", marginTop: 40 }}>
          Continue to Framework Selection
        </button>
      </div>
    </div>
  );
}
