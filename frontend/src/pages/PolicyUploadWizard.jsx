import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE, getCurrentUser } from "../api";
import { useToast } from "../components/Toast";
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Eye,
  Loader2,
  X,
  FileCheck
} from "lucide-react";

export default function PolicyUploadWizard() {
  const { id: assessmentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const user = getCurrentUser();
  const framework = sessionStorage.getItem("compliance") || "ISO/IEC 27001:2022";

  // Dynamic Compulsory Policies based on Framework Selection
  const getCompulsoryPolicies = () => {
    if (framework.includes("GDPR") || framework.includes("DPDPA")) {
      return [
        { id: "comp_1", name: "Data Protection & Privacy Policy", type: "compulsory", status: "Missing", file: null, score: null, report: null },
        { id: "comp_2", name: "Data Retention & Disposal Policy", type: "compulsory", status: "Missing", file: null, score: null, report: null },
        { id: "comp_3", name: "Subject Access Request (SAR) Procedure", type: "compulsory", status: "Missing", file: null, score: null, report: null }
      ];
    } else if (framework.includes("ISO") || framework.includes("SOC 2")) {
      return [
        { id: "comp_1", name: "Information Security Policy", type: "compulsory", status: "Missing", file: null, score: null, report: null },
        { id: "comp_2", name: "Access Control & MFA Policy", type: "compulsory", status: "Missing", file: null, score: null, report: null },
        { id: "comp_3", name: "Incident Management & BCP Plan", type: "compulsory", status: "Missing", file: null, score: null, report: null }
      ];
    } else if (framework.includes("PCI")) {
      return [
        { id: "comp_1", name: "Cardholder Data Encryption Policy", type: "compulsory", status: "Missing", file: null, score: null, report: null },
        { id: "comp_2", name: "Firewall & Network Security Policy", type: "compulsory", status: "Missing", file: null, score: null, report: null },
        { id: "comp_3", name: "Vulnerability Management Policy", type: "compulsory", status: "Missing", file: null, score: null, report: null }
      ];
    } else {
      return [
        { id: "comp_1", name: "Information Security Policy", type: "compulsory", status: "Missing", file: null, score: null, report: null },
        { id: "comp_2", name: "Data Protection Guideline", type: "compulsory", status: "Missing", file: null, score: null, report: null }
      ];
    }
  };

  // State Lists
  const [compulsoryList, setCompulsoryList] = useState(getCompulsoryPolicies);
  const [optionalList, setOptionalList] = useState([
    { id: "opt_1", name: "Remote Work & BYOD Security Policy", type: "optional", status: "Missing", file: null, score: null, report: null },
    { id: "opt_2", name: "Employee Acceptable Use Policy", type: "optional", status: "Missing", file: null, score: null, report: null }
  ]);
  
  // Custom Policy State
  const [customName, setCustomName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Modal State for Gap Report
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [selectedGaps, setSelectedGaps] = useState({});
  const [viewingUpdatedPolicy, setViewingUpdatedPolicy] = useState(null);

  useEffect(() => {
    if (selectedPolicy && selectedPolicy.report?.gaps) {
      const initial = {};
      selectedPolicy.report.gaps.forEach((_, idx) => {
        initial[idx] = true;
      });
      setSelectedGaps(initial);
    } else {
      setSelectedGaps({});
    }
  }, [selectedPolicy]);

  const getUpdatedPolicyDocument = (policy) => {
    const fixed = policy.fixedGaps || [];
    const sections = [
      {
        title: "1. Overview & Scope",
        content: `This document outlines the formal standard procedures and policies of our organization for ensuring continuous compliance with ${framework}. This policy applies to all employees, contractors, departments, and third-party vendor relationships operating within our scope.`
      },
      {
        title: "2. General Rules & Procedures",
        content: "The organization is committed to maintaining high standards of data security and regulatory alignment. Annual audits and reviews will be conducted by the compliance lead to verify enforcement across all departments."
      }
    ];

    fixed.forEach((gap, idx) => {
      const title = typeof gap === "object" ? gap.gap_title : `Gap #${idx+1}`;
      const desc = typeof gap === "object" ? gap.description : gap;
      const remediation = typeof gap === "object" ? gap.remediation_plan : "Implement standard audit logs and retention schedules.";
      
      sections.push({
        title: `3.${idx + 1} Remediated Clause: ${title}`,
        isRemediated: true,
        gapDesc: desc,
        content: `REMEDIATION RULE: ${remediation}\n\nREVISED COMPLIANCE TEXT:\n"To address the gap regarding '${title}', the organization hereby establishes a formal procedure. All operations corresponding to these controls shall follow strict validation criteria. Audits, logs, and evidence of implementation will be captured automatically. Security officers are designated to review enforcement reports monthly and register any deviations in the gap ledger immediately to ensure no control gaps persist."`
      });
    });

    return sections;
  };

  // Helper handler to view gaps for a specific policy dynamically
  const handleViewGaps = (policy) => {
    // Lookup the live object in state to ensure we always have the freshest uploaded details
    const livePolicy = compulsoryList.find(p => p.id === policy.id) || 
                       optionalList.find(p => p.id === policy.id) || 
                       policy;
    setSelectedPolicy(livePolicy);
  };

  // AI Fix Simulation State
  const [fixingPolicyId, setFixingPolicyId] = useState(null);

  // Policy File Upload Handler
  const handleFileUpload = async (policyId, isCompulsory, file) => {
    if (!file) return;

    // Update list status to "Analyzing..."
    const updater = (list) => 
      list.map(item => item.id === policyId ? { ...item, status: "Analyzing...", file: file.name } : item);
    
    if (isCompulsory) setCompulsoryList(updater);
    else setOptionalList(updater);

    try {
      const token = localStorage.getItem("grc_auth_token");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("policy_name", isCompulsory ? compulsoryList.find(p => p.id === policyId).name : optionalList.find(p => p.id === policyId).name);
      formData.append("policy_type", isCompulsory ? "compulsory" : "optional");
      formData.append("target_framework", framework);
      formData.append("assessment_id", assessmentId);

      const response = await fetch(`${API_BASE}/policies/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const uploadResult = await response.json();
      toast.addToast("Policy file uploaded and registered in vault.", "success");

      // Extract dynamic analysis report from the backend API response
      const finalReport = {
        score: uploadResult.score !== undefined ? uploadResult.score : 100,
        gaps: uploadResult.gaps || [],
        recommendations: uploadResult.recommendations || []
      };

      const finalStatus = finalReport.gaps.length === 0 ? "compliant" : "gaps_found";

      const finalUpdater = (list) =>
        list.map(item => item.id === policyId ? { 
          ...item, 
          status: finalStatus, 
          score: finalReport.score, 
          report: finalReport 
        } : item);

      if (isCompulsory) setCompulsoryList(finalUpdater);
      else setOptionalList(finalUpdater);

    } catch (err) {
      console.error("Policy upload error:", err);
      toast.addToast(`Failed to analyze policy: ${err.message}`, "error");

      const failUpdater = (list) => 
        list.map(item => item.id === policyId ? { ...item, status: "Missing", file: null } : item);
      
      if (isCompulsory) setCompulsoryList(failUpdater);
      else setOptionalList(failUpdater);
    }
  };

  // Dynamic Add Custom Policy Row
  const handleAddCustomPolicy = (e) => {
    e.preventDefault();
    if (!customName.trim()) {
      toast.addToast("Please provide a custom policy name", "warning");
      return;
    }

    const newCustomRow = {
      id: `custom_${Date.now()}`,
      name: customName,
      type: "optional",
      status: "Missing",
      file: null,
      score: null,
      report: null
    };

    setOptionalList([...optionalList, newCustomRow]);
    setCustomName("");
    setShowCustomInput(false);
    toast.addToast(`Added custom row: "${newCustomRow.name}"`, "success");
  };

  // AI Auto-Fix Policy Simulation
  const handleAutoFixPolicy = (policyId, isCompulsory, selectedIndices = []) => {
    setFixingPolicyId(policyId);
    toast.addToast("✨ AI Compliance Engine is rewriting and correcting selected policy gaps...", "info");

    setTimeout(() => {
      const fixUpdater = (list) =>
        list.map(item => {
          if (item.id !== policyId) return item;
          
          const currentGaps = item.report?.gaps || [];
          const totalGapsCount = currentGaps.length;
          
          // If selectedIndices is empty, default to fixing all gaps
          const indicesToFix = selectedIndices.length > 0 
            ? selectedIndices 
            : currentGaps.map((_, idx) => idx);

          const remainingGaps = currentGaps.filter((_, idx) => !indicesToFix.includes(idx));
          
          const oldScore = parseFloat(String(item.score || 70).replace(/%/g, '')) || 70;
          const targetScore = 98.4;
          const fixedCount = indicesToFix.length;
          
          let newScore = oldScore;
          if (totalGapsCount > 0) {
            newScore = oldScore + (targetScore - oldScore) * (fixedCount / totalGapsCount);
          } else {
            newScore = targetScore;
          }
          newScore = Number(Number(newScore).toFixed(1));

          const finalStatus = remainingGaps.length === 0 ? "compliant" : "gaps_found";
          
          const previouslyFixed = item.fixedGaps || [];
          const newFixedGaps = indicesToFix.map(idx => currentGaps[idx]);
          const combinedFixed = [...previouslyFixed, ...newFixedGaps];

          const updatedReport = {
            ...item.report,
            score: newScore,
            gaps: remainingGaps
          };

          return {
            ...item,
            status: finalStatus,
            score: newScore,
            report: updatedReport,
            fixedGaps: combinedFixed
          };
        });

      if (isCompulsory) setCompulsoryList(fixUpdater);
      else setOptionalList(fixUpdater);

      setFixingPolicyId(null);
      toast.addToast(`✨ Policy remediation completed successfully.`, "success");
    }, 2000);
  };

  // Delete Custom Row
  const handleDeletePolicyRow = (policyId, isCompulsory) => {
    if (isCompulsory) return;
    setOptionalList(optionalList.filter(p => p.id !== policyId));
    toast.addToast("Removed policy row.", "info");
  };

  return (
    <div className="page" style={{ background: "var(--bg-color)", display: "flex", flexDirection: "column", padding: "40px" }}>
      
      {/* Header section */}
      <div style={{ maxWidth: "1200px", width: "100%", margin: "0 auto 24px auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "1px solid var(--border-color)", padding: "8px 16px", borderRadius: "8px", color: "var(--text-main)", cursor: "pointer", fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <span style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Step 3 of 4: Policy Governance
        </span>
      </div>

      <div style={{ maxWidth: "1200px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
        
        {/* Title Block */}
        <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "20px" }}>
          <h1 style={{ color: "var(--text-main)", fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 8px 0" }}>
            Upload Policy
          </h1>
          <p className="subtitle" style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Upload your corporate governance files for automated AI gap analysis against target standard: <strong style={{ color: "var(--primary)" }}>{framework}</strong>
          </p>
        </div>

        {/* TWO-COLUMN SPLIT WINDOWS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
          
          {/* Left Window: Compulsory Policies */}
          <div style={splitCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                🛡️ Compulsory Policies
              </h2>
              <span style={{ fontSize: "0.75rem", background: "rgba(14, 165, 233, 0.1)", color: "var(--primary)", padding: "4px 8px", borderRadius: "6px", fontWeight: 800 }}>MANDATORY</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {compulsoryList.map(policy => (
                <PolicyUploadRow 
                  key={policy.id}
                  policy={policy}
                  isCompulsory={true}
                  onUpload={(file) => handleFileUpload(policy.id, true, file)}
                  onAutoFix={() => handleAutoFixPolicy(policy.id, true)}
                  onViewReport={() => handleViewGaps(policy)}
                  fixing={fixingPolicyId === policy.id}
                  onViewUpdatedPolicy={() => setViewingUpdatedPolicy(policy)}
                />
              ))}
            </div>
          </div>

          {/* Right Window: Optional & Custom Policies */}
          <div style={splitCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                ⚙️ Optional & Custom Policies
              </h2>
              
              {!showCustomInput ? (
                <button 
                  onClick={() => setShowCustomInput(true)}
                  style={{
                    background: "var(--primary)",
                    color: "var(--surface)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <Plus size={14} /> Add Custom Policy
                </button>
              ) : (
                <button 
                  onClick={() => setShowCustomInput(false)}
                  style={{ background: "none", border: "none", color: "var(--text-light)", cursor: "pointer" }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Inline Custom Policy Row Creator Form */}
            {showCustomInput && (
              <form onSubmit={handleAddCustomPolicy} style={{ display: "flex", gap: "10px", background: "var(--surface-hover)", padding: "12px", borderRadius: "10px", marginBottom: "16px", border: "1px solid var(--cyber-border)" }}>
                <input 
                  type="text" 
                  placeholder="e.g. Asset Encryption Policy"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{
                    flex: 1,
                    background: "var(--surface)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    padding: "0 10px",
                    fontSize: "0.85rem",
                    color: "var(--text-main)",
                    outline: "none"
                  }}
                  required
                />
                <button type="submit" style={{ background: "#1e1e1e", color: "#ffffff", border: "none", borderRadius: "6px", padding: "8px 16px", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer" }}>
                  Add Row
                </button>
              </form>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {optionalList.map(policy => (
                <PolicyUploadRow 
                  key={policy.id}
                  policy={policy}
                  isCompulsory={false}
                  onUpload={(file) => handleFileUpload(policy.id, false, file)}
                  onAutoFix={() => handleAutoFixPolicy(policy.id, false)}
                  onViewReport={() => handleViewGaps(policy)}
                  onDelete={() => handleDeletePolicyRow(policy.id, false)}
                  fixing={fixingPolicyId === policy.id}
                  onViewUpdatedPolicy={() => setViewingUpdatedPolicy(policy)}
                />
              ))}
            </div>
          </div>

        </div>

        {/* BOTTOM FLOW NAVIGATION BAR */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ background: "var(--surface)", padding: "12px 20px", border: "1px solid var(--border-color)", borderRadius: "10px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            💡 Upload compulsory policies to help the AI map questionnaire controls automatically.
          </div>
          
          <button 
            onClick={() => navigate(`/questionnaire-enhanced/${assessmentId}`)}
            style={{
              background: "var(--primary)",
              color: "var(--surface)",
              border: "none",
              borderRadius: "20px",
              padding: "12px 32px",
              fontSize: "1rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(var(--primary-rgb), 0.2)"
            }}
          >
            Proceed to Questionnaire <ArrowRight size={18} />
          </button>
        </div>

      </div>

      {/* --- PREVIEW REPORT MODAL PANEL --- */}
      {selectedPolicy && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "var(--overlay-bg)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div 
            className="card"
            style={{
              maxWidth: "950px",
              width: "90%",
              maxHeight: "85vh",
              padding: "40px",
              border: "1px solid var(--cyber-border)",
              boxShadow: "var(--shadow-lg)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              background: "var(--surface)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedPolicy(null)}
              style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: "var(--text-light)", fontSize: "1.5rem", cursor: "pointer" }}
            >
              &times;
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
              <FileCheck size={28} color="var(--primary)" />
              <div>
                <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)" }}>AI Audit Report</h3>
                <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>{selectedPolicy.name}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1, overflow: "hidden" }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-hover)", padding: "16px 24px", borderRadius: "10px" }}>
                <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 600 }}>Calculated Compliance Score:</span>
                <span style={{ fontSize: "1.5rem", fontWeight: 900, color: selectedPolicy.score >= 80 ? "var(--success)" : "var(--warning)" }}>
                  {selectedPolicy.score}%
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, overflow: "hidden" }}>
                <h4 style={{ fontSize: "1.05rem", textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.05em", margin: "0 0 4px 0", fontWeight: 800 }}>
                  🚨 Identified Gaps & Remediation Plans ({selectedPolicy.report?.gaps?.length || 0})
                </h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1, overflowY: "auto", paddingRight: "8px" }}>
                  {selectedPolicy.report?.gaps && selectedPolicy.report.gaps.length > 0 ? (
                    selectedPolicy.report.gaps.map((gap, i) => {
                      const isObj = typeof gap === "object" && gap !== null;
                      const title = isObj ? gap.gap_title : `Gap #${i+1}`;
                      const desc = isObj ? gap.description : gap;
                      const priority = isObj ? gap.priority : "High";
                      const remediation = isObj ? gap.remediation_plan : selectedPolicy.report.recommendations?.[i];

                      const getPrioBadge = (p) => {
                        const lowP = String(p).toLowerCase();
                        if (lowP === "high" || lowP === "critical") return { bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444", label: "HIGH" };
                        if (lowP === "medium") return { bg: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", label: "MEDIUM" };
                        return { bg: "rgba(16, 185, 129, 0.1)", color: "#10b981", label: "LOW" };
                      };
                      const badge = getPrioBadge(priority);

                      return (
                        <div key={i} style={{
                          background: "var(--surface-hover)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "12px",
                          padding: "20px",
                          display: "flex",
                          flexDirection: "row",
                          gap: "18px",
                          alignItems: "flex-start"
                        }}>
                          <div style={{ paddingTop: "4px" }}>
                            <input 
                              type="checkbox"
                              checked={!!selectedGaps[i]}
                              onChange={(e) => {
                                setSelectedGaps(prev => ({
                                  ...prev,
                                  [i]: e.target.checked
                                }));
                              }}
                              style={{
                                width: "20px",
                                height: "20px",
                                cursor: "pointer",
                                accentColor: "var(--primary)"
                              }}
                            />
                          </div>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                              <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--text-main)" }}>
                                {title}
                              </span>
                              <span style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                background: badge.bg,
                                color: badge.color
                              }}>
                                {badge.label}
                              </span>
                            </div>
                            
                            <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                              {desc}
                            </p>

                            {remediation && (
                              <div style={{
                                marginTop: "6px",
                                paddingTop: "12px",
                                borderTop: "1px dashed var(--border-color)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px"
                              }}>
                                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  ✨ Recommended Remediation:
                                </span>
                                <span style={{ fontSize: "0.95rem", color: "var(--text-main)", lineHeight: 1.5 }}>
                                  {remediation}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: "var(--text-muted)", fontSize: "0.95rem", textAlign: "center", padding: "30px" }}>
                      No gaps identified.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
                <button 
                  onClick={() => {
                    const isComp = compulsoryList.some(p => p.id === selectedPolicy.id);
                    const selectedIndices = Object.keys(selectedGaps)
                      .filter(idx => selectedGaps[idx])
                      .map(Number);
                    
                    if (selectedIndices.length === 0) {
                      toast.addToast("Please select at least one gap to auto-fix", "warning");
                      return;
                    }
                    
                    handleAutoFixPolicy(selectedPolicy.id, isComp, selectedIndices);
                    setSelectedPolicy(null);
                  }}
                  style={{
                    flex: 1,
                    background: "var(--primary)",
                    color: "var(--surface)",
                    border: "none",
                    borderRadius: "10px",
                    padding: "14px",
                    fontSize: "1.05rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  <Sparkles size={18} /> Auto-Fix Selected Gaps
                </button>
                <button 
                  onClick={() => setSelectedPolicy(null)}
                  style={{
                    flex: 0.4,
                    background: "none",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                    padding: "14px",
                    fontSize: "1.05rem",
                    color: "var(--text-light)",
                    cursor: "pointer",
                    fontWeight: 700
                  }}
                >
                  Cancel
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* --- VIEW UPDATED POLICY MODAL PANEL --- */}
      {viewingUpdatedPolicy && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "var(--overlay-bg)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div 
            className="card"
            style={{
              maxWidth: "950px",
              width: "90%",
              maxHeight: "85vh",
              padding: "40px",
              border: "1px solid var(--cyber-border)",
              boxShadow: "var(--shadow-lg)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              background: "var(--surface)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setViewingUpdatedPolicy(null)}
              style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: "var(--text-light)", fontSize: "1.5rem", cursor: "pointer" }}
            >
              &times;
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
              <FileCheck size={28} color="var(--success)" />
              <div>
                <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                  Remediated Policy Document
                  <span style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.1)", color: "var(--success)", padding: "4px 8px", borderRadius: "6px", fontWeight: 800, marginLeft: "8px" }}>
                    AI Remediated
                  </span>
                </h3>
                <span style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>{viewingUpdatedPolicy.name}</span>
              </div>
            </div>

            <div style={{ 
              flex: 1, 
              overflowY: "auto", 
              paddingRight: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "24px"
            }}>
              {getUpdatedPolicyDocument(viewingUpdatedPolicy).map((section, idx) => {
                if (section.isRemediated) {
                  return (
                    <div 
                      key={idx} 
                      style={{
                        background: "rgba(16, 185, 129, 0.03)",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                        borderRadius: "12px",
                        padding: "24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        position: "relative"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--success)" }}>
                          {section.title}
                        </h4>
                        <span style={{
                          background: "rgba(16, 185, 129, 0.1)",
                          color: "var(--success)",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          ✨ AI ADDITION
                        </span>
                      </div>
                      
                      {section.gapDesc && (
                        <div style={{ 
                          fontSize: "0.9rem", 
                          color: "var(--text-muted)", 
                          background: "var(--surface-hover)",
                          padding: "10px 14px", 
                          borderRadius: "6px",
                          borderLeft: "3px solid var(--warning)",
                          margin: "4px 0"
                        }}>
                          <strong>Addressed Gap:</strong> {section.gapDesc}
                        </div>
                      )}

                      <pre style={{
                        margin: 0,
                        fontSize: "0.95rem",
                        color: "var(--text-main)",
                        whiteSpace: "pre-wrap",
                        fontFamily: "inherit",
                        lineHeight: 1.6,
                        background: "rgba(16, 185, 129, 0.05)",
                        padding: "16px",
                        borderRadius: "8px",
                        border: "1px dashed rgba(16, 185, 129, 0.3)"
                      }}>
                        {section.content}
                      </pre>
                    </div>
                  );
                }

                return (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>
                      {section.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                      {section.content}
                    </p>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
              <button 
                onClick={() => setViewingUpdatedPolicy(null)}
                style={{
                  background: "var(--primary)",
                  color: "var(--surface)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 30px",
                  fontSize: "1rem",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── UPLOAD ROW ITEM COMPONENT ─────────────────────────────────────────

function PolicyUploadRow({ policy, isCompulsory, onUpload, onAutoFix, onViewReport, onDelete, fixing, onViewUpdatedPolicy }) {
  
  const getBadgeStyle = (status) => {
    if (status === "Missing") return { background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.15)" };
    if (status === "Analyzing...") return { background: "rgba(99, 102, 241, 0.08)", color: "#6366f1", border: "1px solid rgba(99, 102, 241, 0.15)" };
    if (status === "gaps_found") return { background: "rgba(245, 158, 11, 0.08)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.15)" };
    return { background: "rgba(16, 185, 129, 0.08)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.15)" };
  };

  const getStatusText = (status) => {
    if (status === "Missing") return "Missing";
    if (status === "Analyzing...") return "Analyzing...";
    if (status === "gaps_found") return "Gaps Found";
    return "Compliant";
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      padding: "16px",
      background: "var(--surface)",
      border: "1px solid var(--border-color)",
      borderRadius: "12px",
      transition: "all 0.2s"
    }}>
      
      {/* Policy name and status badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
          <FileText size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {policy.name}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "0.7rem",
            fontWeight: 800,
            textTransform: "uppercase",
            ...getBadgeStyle(policy.status)
          }}>
            {getStatusText(policy.status)}
          </span>
          
          {!isCompulsory && policy.status === "Missing" && (
            <button 
              onClick={onDelete}
              style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Action Zone / File uploading / Gaps tools */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        
        {policy.status === "Missing" && (
          <label style={{
            flex: 1,
            height: "40px",
            background: "var(--surface-hover)",
            border: "1px dashed var(--border-color)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontWeight: 700,
            transition: "all 0.2s"
          }}>
            <Upload size={14} /> Upload Policy File
            <input 
              type="file" 
              accept=".pdf,.docx,.doc,.txt"
              onChange={(e) => onUpload(e.target.files[0])}
              style={{ display: "none" }}
            />
          </label>
        )}

        {policy.status === "Analyzing..." && (
          <div style={{
            flex: 1,
            height: "40px",
            background: "var(--surface-hover)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "0.8rem",
            color: "var(--primary)",
            fontWeight: 700
          }}>
            <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} />
             Agent is analyzing document structure...
          </div>
        )}

        {policy.status === "gaps_found" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              
              <button 
                onClick={onViewReport}
                style={{
                  flex: 1,
                  height: "40px",
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.15)",
                  color: "#f59e0b",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <Eye size={14} /> View Gaps ({policy.report?.gaps.length})
              </button>

              <button 
                onClick={onAutoFix}
                disabled={fixing}
                style={{
                  flex: 1,
                  height: "40px",
                  background: "var(--primary)",
                  color: "var(--surface)",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                {fixing ? (
                  <>
                    <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Remediation...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Auto-Fix Policy
                  </>
                )}
              </button>

            </div>

            {policy.fixedGaps && policy.fixedGaps.length > 0 && (
              <button
                onClick={onViewUpdatedPolicy}
                style={{
                  width: "100%",
                  height: "40px",
                  background: "var(--surface)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  color: "var(--text-main)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <Eye size={14} /> View Updated Policy
              </button>
            )}

          </div>
        )}

        {policy.status === "compliant" && (
          <div style={{ display: "flex", gap: "10px", width: "100%", flexDirection: "column" }}>
            <div style={{
              width: "100%",
              height: "40px",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.15)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "0.8rem",
              color: "#10b981",
              fontWeight: 800
            }}>
              <CheckCircle size={15} /> Verified Compliant (Score: {policy.score}%)
            </div>
            
            {policy.fixedGaps && policy.fixedGaps.length > 0 && (
              <button
                onClick={onViewUpdatedPolicy}
                style={{
                  width: "100%",
                  height: "40px",
                  background: "var(--surface)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  color: "var(--text-main)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <Eye size={14} /> View Updated Policy
              </button>
            )}
          </div>
        )}

      </div>

    </div>
  );
}

// ─── STYLING OBJECTS ───────────────────────────────────────────────────

const splitCardStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border-color)",
  borderRadius: "16px",
  padding: "24px",
  boxShadow: "var(--shadow-sm)",
  display: "flex",
  flexDirection: "column",
  minHeight: "400px"
};
