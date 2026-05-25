import React, { useState } from 'react';
import { runComplianceAgent } from '../api';

const ComplianceAgent = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError(null);
  };

  const handleRunAgent = async () => {
    if (!file) {
      setError("Please select a policy document first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await runComplianceAgent(file);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to run compliance agent.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-on-dark)' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '10px', color: 'var(--accent)' }}>AI Compliance Mapping Agent</h1>
        <p style={{ color: 'var(--text-light)', fontSize: '1.1rem' }}>Upload policies and let the Multi-Agent vector engine map controls automatically.</p>
      </header>
      
      <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '30px', borderRadius: '16px', border: '1px solid var(--primary-light)', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '15px', color: 'white' }}>Upload Policy Document</h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '20px' }}>
          Select your security policy (PDF, DOCX, or TXT). The agent pipeline will isolate control parameters and map matches across DPDPA, GDPR, HIPAA, ISO 27001, NIST CSF 2.0, SOC 2, PCI DSS v4.0, and CIS.
        </p>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="field" style={{ margin: 0, flexGrow: 1 }}>
            <input 
              type="file" 
              onChange={handleFileChange}
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--text-light)', color: 'var(--text-on-dark)' }}
              accept=".pdf,.docx,.txt"
            />
          </div>
          <button 
            onClick={handleRunAgent}
            disabled={loading || !file}
            className="btn btn-primary"
            style={{ 
              background: loading || !file ? '#444' : 'var(--primary)', 
              color: 'white',
              opacity: loading || !file ? 0.6 : 1,
              minWidth: '150px'
            }}
          >
            {loading ? 'Analyzing...' : 'Run Agent'}
          </button>
        </div>
        
        {error && <p style={{ color: '#ff4d4d', marginTop: '15px', fontWeight: '600' }}>{error}</p>}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: '50px', height: '50px', border: '5px solid var(--primary-light)', borderTop: '5px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <p style={{ color: 'var(--text-light)' }}>The multi-agent pipeline is parsing chunks, executing vector matches, and running a virtual CISO gap audit...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {result && (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{ marginBottom: '30px', padding: '15px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div>
              <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>Analyzed: </span>
              <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{result.framework || file.name}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>Status: </span>
              <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#10b981' }}>Complete</span>
            </div>
          </div>

          {/* KPI Dashboard Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '25px', borderRadius: '12px', borderLeft: '5px solid var(--primary)' }}>
              <p style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px' }}>Controls Extracted</p>
              <p style={{ fontSize: '2.5rem', fontWeight: '800' }}>{result.total_controls}</p>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '25px', borderRadius: '12px', borderLeft: '5px solid #f59e0b' }}>
              <p style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px' }}>Identified Gaps</p>
              <p style={{ fontSize: '2.5rem', fontWeight: '800' }}>{result.gaps_identified?.length || 0}</p>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '25px', borderRadius: '12px', borderLeft: '5px solid #ef4444' }}>
              <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px' }}>Open Vulnerability Risks</p>
              <p style={{ fontSize: '2.5rem', fontWeight: '800' }}>{result.open_risks?.length || 0}</p>
            </div>
          </div>

          {/* Main Vector Mapping Table */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '20px', color: 'var(--accent)' }}>Extracted Controls & Framework Mappings</h2>
            <div style={{ background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-main)' }}>
                <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '700', width: '10%' }}>ID</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '700', width: '55%' }}>Internal Evidence Assertion</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '700', width: '23%' }}>Closest Framework Match</th>
                    <th style={{ padding: '15px 20px', textAlign: 'left', fontWeight: '700', width: '12%' }}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {result.controls_found?.map((ctrl, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '15px 20px', fontWeight: '600', color: 'var(--accent)', fontFamily: 'monospace' }}>{ctrl.evidence_id}</td>
                      <td style={{ padding: '15px 20px', lineHeight: '1.5' }}>{ctrl.evidence_text}</td>
                      <td style={{ padding: '15px 20px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 10px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid var(--primary-light)' }}>
                          {ctrl.mapped_framework}: {ctrl.framework_control_id}
                        </span>
                      </td>
                      <td style={{ padding: '15px 20px', fontFamily: 'monospace', fontWeight: '700', color: '#10b981' }}>
                        {Math.round(ctrl.confidence_score * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Compliance Audit & Recommendations split screen layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
            <section>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '20px', color: '#f59e0b' }}>Compliance Gaps & Liabilities</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {result.gaps_identified?.map((gap, i) => (
                  <div key={i} style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', borderLeft: '6px solid #f59e0b', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', color: 'var(--text-main)' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '500', lineHeight: '1.4' }}>{gap}</p>
                    {result.open_risks?.[i] && (
                      <p style={{ margin: '10px 0 0 0', fontSize: '0.85rem', color: '#ef4444', fontStyle: 'italic' }}>
                        ⚠️ Associated Liability: {result.open_risks[i]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '20px', color: '#10b981' }}>Remediation Action Plans</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {result.compliance_recommendations?.map((rec, i) => (
                  <div key={i} style={{ background: 'var(--surface)', padding: '20px', borderRadius: '12px', borderLeft: '6px solid #10b981', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', color: 'var(--text-main)' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '500', lineHeight: '1.4' }}>{rec}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
};

export default ComplianceAgent;