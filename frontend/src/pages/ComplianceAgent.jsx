import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { runComplianceAgent, getCurrentUser } from '../api';
import { 
  Shield, 
  FileSearch, 
  AlertCircle, 
  Upload, 
  CheckCircle, 
  ShieldAlert, 
  Activity, 
  Lock, 
  FileText,
  AlertTriangle,
  Zap,
  LayoutGrid,
  ClipboardCheck,
  Search,
  Terminal,
  Cpu,
  Layers,
  Eye,
  RefreshCw,
  FileCode,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  Compass,
  ArrowLeft
} from 'lucide-react';

const ComplianceAgent = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isTeamMember = user?.role === 'team_member';
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFramework, setSelectedFramework] = useState('all');
  const [auditedFramework, setAuditedFramework] = useState(null);

  const frameworks = [
    { id: 'all', name: 'All Frameworks', desc: 'Cross-map against all 8 regulatory indices' },
    { id: 'ISO-27001-2022', name: 'ISO 27001:2022', desc: 'International information security standard' },
    { id: 'GDPR', name: 'GDPR', desc: 'EU General Data Protection Regulation' },
    { id: 'SOC2', name: 'SOC 2', desc: 'AICPA Trust Services Criteria' },
    { id: 'DPDPA-2023', name: 'DPDPA-2023', desc: 'India Digital Personal Data Protection Act' },
    { id: 'HIPAA', name: 'HIPAA', desc: 'US Health Insurance Portability Act' },
    { id: 'NIST-CSF-2.0', name: 'NIST CSF 2.0', desc: 'NIST Cybersecurity Framework' },
    { id: 'PCI-DSS-v4.0', name: 'PCI DSS v4.0', desc: 'Payment Card Industry Data Security' },
    { id: 'CIS-v8', name: 'CIS Controls v8', desc: 'Critical Security Controls' },
  ];
  
  // Advanced UX: Scanner Terminal Logs state
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [expandedControl, setExpandedControl] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // all, matched, gaps, roadmap
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const scannerLogs = [
    "[SYSTEM-SECURE]: Initializing autonomous multi-agent pipeline...",
    "[VECTOR-CHUNK]: Segmenting policy document into semantic block nodes...",
    "[HYBRID-INDEXING]: Executing semantic search across global compliance databases...",
    "[AGENT-MAPPING]: Cross-referencing evidence clusters with target framework indices...",
    "[LLM-CROSS-REASONING]: Evaluating security posture against GDPR/SOC2 controls...",
    "[VIRTUAL-CISO]: Identifying compliance gap liabilities and operational risks...",
    "[ROADMAP-SYNTHESIS]: Formulating mitigation strategies and code patches...",
    "[PIPELINE-COMPLETE]: Generating high-fidelity compliance telemetry dashboard..."
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      setCurrentLogIndex(0);
      interval = setInterval(() => {
        setCurrentLogIndex((prev) => (prev < scannerLogs.length - 1 ? prev + 1 : prev));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleFileChange = (e) => {
    if (isTeamMember) return;
    setFile(e.target.files[0]);
    setResult(null);
    setError(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isTeamMember) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isTeamMember) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleRunAgent = async () => {
    if (isTeamMember) return;
    if (!file) {
      setError("Please select a policy document first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await runComplianceAgent(file, selectedFramework);
      setResult(data);
      setAuditedFramework(selectedFramework); // Lock in the framework that was audited
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to run compliance agent.");
    } finally {
      setLoading(false);
    }
  };

  const theme = {
    bg: '#05070F',
    surface: '#0B0F1E',
    surfaceGlass: 'rgba(11, 15, 30, 0.75)',
    border: '#1E293B',
    borderNeon: 'rgba(14, 165, 233, 0.4)',
    textMain: '#F8FAFC',
    textMuted: '#94A3B8',
    accent: '#0EA5E9',
    accentGlow: 'rgba(14, 165, 233, 0.3)',
    emerald: '#10B981',
    emeraldGlow: 'rgba(16, 185, 129, 0.25)',
    amber: '#F59E0B',
    amberGlow: 'rgba(245, 158, 11, 0.25)',
    red: '#EF4444',
    redGlow: 'rgba(239, 68, 68, 0.25)',
    purple: '#A855F7',
    purpleGlow: 'rgba(168, 85, 247, 0.25)'
  };

  // Filter mapped controls based on tab and search query
  const filteredControls = result?.controls_found?.filter(ctrl => {
    // 1. Filter by selected framework if not 'all'
    if (selectedFramework !== 'all' && ctrl.mapped_framework !== selectedFramework) {
      return false;
    }

    const matchesSearch = 
      ctrl.evidence_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ctrl.mapped_framework?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ctrl.framework_control_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ctrl.evidence_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'matched') return matchesSearch && ctrl.confidence_score >= 0.75;
    if (activeTab === 'gaps') return matchesSearch && ctrl.confidence_score < 0.75;
    return matchesSearch;
  }) || [];

  return (
    <div 
      className="agent-layout-full-width"
      style={{ 
        minHeight: '100vh', 
        background: theme.bg, 
        color: theme.textMain,
        fontFamily: "'Inter', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Cyber Grid Effects */}
      <div className="cyber-grid" />
      <div className="radial-glow" />

      {/* Back Button */}
      <div style={{ position: 'relative', zIndex: 10, padding: '20px 0 0 0' }}>
        <button 
          onClick={() => navigate('/start')}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${theme.border}`,
            color: theme.textMain,
            padding: '10px 20px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '700',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.borderColor = theme.accent; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; e.currentTarget.style.borderColor = theme.border; }}
        >
          <ArrowLeft size={18} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Futuristic Cyber Header */}
      <header style={{ 
        marginBottom: '40px', 
        borderBottom: `1px solid ${theme.border}`, 
        paddingBottom: '30px', 
        width: '100%',
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
            <div style={{
              background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.purple} 100%)`,
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 20px ${theme.accent}66`
            }}>
              <Shield size={30} color="#fff" />
            </div>
            <div>
              <h1 style={{ 
                fontSize: '2.8rem', 
                fontWeight: '900', 
                margin: 0, 
                letterSpacing: '-0.03em', 
                background: `linear-gradient(135deg, ${theme.textMain} 30%, ${theme.accent} 100%)`, 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                GRC Agent
                <span className="live-badge">ACTIVE AGENTS</span>
              </h1>
            </div>
          </div>
          <p style={{ color: theme.textMuted, fontSize: '1.25rem', margin: 0, fontWeight: '400', width: '100%' }}>
            Autonomous vector pipeline parsing semantic policy constructs and mapping compliance gaps in real-time.
          </p>
        </div>

        {/* Telemetry quick info */}
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          background: theme.surfaceGlass, 
          padding: '12px 24px', 
          borderRadius: '16px', 
          border: `1px solid ${theme.border}`,
          backdropFilter: 'blur(12px)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
        }}>
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <div style={{ color: theme.accent, fontWeight: '800', fontSize: '1.2rem' }}>4.0</div>
            <div style={{ color: theme.textMuted, fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>Engine v</div>
          </div>
          <div style={{ width: '1px', background: theme.border }} />
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <div style={{ color: theme.emerald, fontWeight: '800', fontSize: '1.2rem' }}>100%</div>
            <div style={{ color: theme.textMuted, fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>Accuracy</div>
          </div>
          <div style={{ width: '1px', background: theme.border }} />
          <div style={{ textAlign: 'center', minWidth: '80px' }}>
            <div style={{ color: theme.purple, fontWeight: '800', fontSize: '1.2rem' }}>RAG-V4</div>
            <div style={{ color: theme.textMuted, fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>Store</div>
          </div>
        </div>
      </header>

      {/* Core Drag & Drop Upload Zone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ 
          background: isDragOver ? `rgba(14, 165, 233, 0.05)` : theme.surfaceGlass, 
          padding: '50px 40px', 
          borderRadius: '24px', 
          border: isDragOver ? `2px dashed ${theme.accent}` : `1px solid ${theme.border}`, 
          marginBottom: '40px',
          textAlign: 'left',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isDragOver ? `0 0 35px ${theme.accentGlow}` : '0 20px 50px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          backdropFilter: 'blur(16px)',
          zIndex: 2
        }}
      >
        {/* Animated top indicator bar */}
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          height: '3px', 
          background: `linear-gradient(90deg, transparent, ${theme.accent}, ${theme.purple}, transparent)` 
        }} />
        <div className="glow-scanner" style={{ animationPlayState: loading ? 'running' : 'paused' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '50px', alignItems: 'start', width: '100%', minHeight: '380px' }}>
          {/* LEFT SIDE: Header and Frameworks Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '5px' }}>
              <div className="pulse-circle">
                <Upload size={32} color={theme.accent} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.9rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: theme.textMain }}>Ingest Security Policy Assets</h2>
                <p style={{ color: theme.textMuted, margin: '5px 0 0 0', fontSize: '1.05rem' }}>
                  Deploy policy document nodes onto our vectorized multi-agent analysis grid.
                </p>
              </div>
            </div>
            
            <p style={{ color: theme.textMuted, lineHeight: '1.65', fontSize: '1.05rem', margin: 0 }}>
              Drop your cybersecurity policy guidelines here (PDF, DOCX, TXT). The agent will automatically ingest, split, vectorize, and evaluate your compliance footprint against GDPR, HIPAA, SOC 2, ISO 27001, and DPDPA frameworks.
            </p>

            {/* Framework Selection Section */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                <Sliders size={22} color={theme.accent} />
                <span style={{ fontSize: '1.25rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textMain }}>Framework Mapping</span>
              </div>
              
              {/* Grid 2-in-a-row (2 columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                {frameworks.map((fw) => (
                  <div 
                    key={fw.id}
                    onClick={() => setSelectedFramework(fw.id)}
                    style={{
                      background: selectedFramework === fw.id ? `rgba(14, 165, 233, 0.15)` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${selectedFramework === fw.id ? theme.accent : theme.border}`,
                      borderRadius: '16px',
                      padding: '16px 20px',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: selectedFramework === fw.id ? `0 0 20px ${theme.accentGlow}` : 'none'
                    }}
                    onMouseOver={(e) => { if (selectedFramework !== fw.id) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                    onMouseOut={(e) => { if (selectedFramework !== fw.id) e.currentTarget.style.borderColor = theme.border; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: '800', color: selectedFramework === fw.id ? theme.accent : theme.textMain }}>{fw.name}</span>
                      {selectedFramework === fw.id && <CheckCircle size={16} color={theme.accent} />}
                    </div>
                    <span style={{ fontSize: '0.85rem', color: theme.textMuted, lineHeight: '1.4' }}>{fw.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Upload & Execute Buttons (shifted to right, clean alignment) */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            minHeight: '380px',
            background: 'rgba(255, 255, 255, 0.01)',
            borderLeft: `1px solid ${theme.border}`,
            paddingLeft: '50px',
            gap: '30px'
          }}>
            {/* Choose Policy Document label (larged and premium) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', width: '100%' }}>
              <label style={{ 
                cursor: 'pointer', 
                padding: '24px 40px', 
                background: file ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)', 
                border: `2px dashed ${file ? theme.emerald : theme.border}`,
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '15px',
                transition: 'all 0.3s ease',
                width: '90%',
                maxWidth: '400px',
                textAlign: 'center',
                boxShadow: file ? `0 0 25px ${theme.emeraldGlow}` : 'none'
              }}
              onMouseOver={(e) => { 
                e.currentTarget.style.background = file ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.06)'; 
                e.currentTarget.style.borderColor = theme.accent;
                e.currentTarget.style.boxShadow = `0 0 25px ${theme.accentGlow}`;
              }}
              onMouseOut={(e) => { 
                e.currentTarget.style.background = file ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)'; 
                e.currentTarget.style.borderColor = file ? theme.emerald : theme.border;
                e.currentTarget.style.boxShadow = file ? `0 0 25px ${theme.emeraldGlow}` : 'none';
              }}
              >
                <FileSearch size={32} color={file ? theme.emerald : theme.accent} />
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: theme.textMain }}>
                  {file ? file.name : 'Choose Policy Document'}
                </span>
                <span style={{ fontSize: '0.85rem', color: theme.textMuted }}>
                  Supports PDF, DOCX, TXT
                </span>
                <input 
                  type="file" 
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  accept=".pdf,.docx,.txt"
                />
              </label>

              {file && (
                <button 
                  onClick={() => { setFile(null); setResult(null); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme.red,
                    cursor: 'pointer',
                    fontSize: '1.05rem',
                    fontWeight: '800',
                    transition: 'all 0.2s ease',
                    textDecoration: 'underline'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#ff6b6b'}
                  onMouseOut={(e) => e.currentTarget.style.color = theme.red}
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Execute Neural Audit Button below upload button */}
            <button 
              onClick={handleRunAgent}
              disabled={loading || !file}
              style={{ 
                background: loading || !file ? 'rgba(255,255,255,0.02)' : `linear-gradient(135deg, ${theme.accent} 0%, ${theme.purple} 100%)`, 
                color: 'white',
                opacity: loading || !file ? 0.4 : 1,
                padding: '24px 50px',
                borderRadius: '20px',
                border: `1px solid ${loading || !file ? theme.border : 'transparent'}`,
                fontWeight: '900',
                fontSize: '1.25rem',
                cursor: loading || !file ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '15px',
                boxShadow: loading || !file ? 'none' : `0 0 35px ${theme.accent}55`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                width: '90%',
                maxWidth: '400px'
              }}
              onMouseEnter={(e) => { if(!loading && file) e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={(e) => { if(!loading && file) e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? (
                <>
                  <div style={{ width: '24px', height: '24px', border: '3px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span>Analyzing Cluster...</span>
                </>
              ) : (
                <>
                  <Zap size={24} />
                  <span>Execute Neural Audit</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {error && (
          <div style={{ 
            marginTop: '25px', 
            padding: '16px 24px', 
            background: `${theme.red}15`, 
            border: `1px solid ${theme.red}33`, 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            color: theme.red 
          }}>
            <AlertTriangle size={20} />
            <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{error}</span>
          </div>
        )}
      </div>

      {/* Cyber Loader Terminal Screen */}
      {loading && (
        <div style={{ 
          background: '#020308', 
          borderRadius: '24px', 
          border: `1px solid ${theme.border}`,
          padding: '40px',
          marginBottom: '50px',
          boxShadow: `0 0 50px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.9)`,
          position: 'relative',
          overflow: 'hidden',
          zIndex: 2,
          animation: 'fadeIn 0.5s ease'
        }}>
          {/* Neon terminal line scanner */}
          <div className="terminal-scanline" />
          
          <div style={{ display: 'flex', gap: '30px', alignItems: 'center', marginBottom: '30px' }}>
            <div className="radar-grid">
              <div className="radar-sweep" />
              <Cpu size={24} color={theme.accent} className="spinning-cpu" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: theme.textMain }}>Scanning Document Clusters</h3>
              <p style={{ color: theme.textMuted, margin: '5px 0 0 0', fontSize: '0.95rem' }}>Autonomous CISO agent vector parsing and hybrid RAG search matching...</p>
            </div>
          </div>

          <div style={{ 
            background: '#04060C',
            border: `1px solid rgba(255,255,255,0.03)`,
            borderRadius: '14px',
            padding: '24px',
            fontFamily: "'Courier New', Courier, monospace",
            minHeight: '160px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {scannerLogs.slice(0, currentLogIndex + 1).map((log, index) => {
              const isLast = index === currentLogIndex;
              return (
                <div key={index} style={{ 
                  color: isLast ? theme.accent : theme.textMuted, 
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ color: isLast ? theme.accent : 'rgba(255,255,255,0.1)' }}>❯</span>
                  <span>{log}</span>
                  {isLast && <span className="blinking-cursor">█</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dashboard Result Workspace */}
      {result && (
        <div style={{ 
          animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)', 
          zIndex: 2, 
          position: 'relative',
          width: '100%',
          maxWidth: 'none'
        }}>
          
          {/* High Tech Audit Status Banner */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '35px', 
            background: 'linear-gradient(90deg, rgba(11,15,30,0.85) 0%, rgba(16,24,48,0.85) 100%)', 
            padding: '24px 35px', 
            borderRadius: '20px', 
            border: `1px solid ${theme.border}`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4)`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '10px',
                borderRadius: '10px',
                border: `1px solid ${theme.emerald}33`
              }}>
                <FileCode size={24} color={theme.emerald} />
              </div>
              <div>
                <div style={{ color: theme.textMuted, fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase' }}>Ingested Asset & Target Scope</div>
                <div style={{ fontWeight: '800', fontSize: '1.25rem', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>{file?.name || result.framework}</span>
                  <span style={{
                    background: `rgba(14, 165, 233, 0.15)`,
                    color: theme.accent,
                    border: `1px solid ${theme.accent}44`,
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Scope: {frameworks.find(f => f.id === auditedFramework)?.name || 'ALL'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: theme.textMuted, fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>Audit Status</div>
                <div style={{ fontWeight: '800', fontSize: '1.1rem', color: theme.emerald }}>VECTOR COMPILATION SECURE</div>
              </div>
              <div className="pulse-emerald">
                <CheckCircle size={20} color="#fff" />
              </div>
            </div>
          </div>

          {/* Futuristic Metric Dashboard Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', marginBottom: '45px' }}>
            <MetricDashboardCard 
              icon={<ClipboardCheck size={28} color={theme.accent} />}
              label="Vector Controls Found"
              value={result.total_controls}
              desc="Total mapped cybersecurity provisions parsed from policy data"
              color={theme.accent}
              glowColor={theme.accentGlow}
              theme={theme}
            />
            <MetricDashboardCard 
              icon={<ShieldAlert size={28} color={theme.amber} />}
              label="Compliance Gaps Identified"
              value={result.gaps_identified?.length || 0}
              desc="Discrepancies identified relative to regulatory indexes"
              color={theme.amber}
              glowColor={theme.amberGlow}
              theme={theme}
            />
            <MetricDashboardCard 
              icon={<Activity size={28} color={theme.red} />}
              label="Security Liabilities"
              value={result.open_risks?.length || 0}
              desc="Critical liability exposure vectors requiring mitigation"
              color={theme.red}
              glowColor={theme.redGlow}
              theme={theme}
            />
          </div>

          {/* Futuristic Tab Filters and Search */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '30px',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <div style={{ 
              display: 'flex', 
              background: 'rgba(255,255,255,0.02)', 
              padding: '6px', 
              borderRadius: '14px', 
              border: `1px solid ${theme.border}` 
            }}>
              <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All Controls" icon={<LayoutGrid size={16} />} count={result.controls_found?.filter(c => selectedFramework === 'all' || c.mapped_framework === selectedFramework).length || 0} theme={theme} />
              <TabButton active={activeTab === 'matched'} onClick={() => setActiveTab('matched')} label="Strong Matches" icon={<CheckCircle size={16} />} count={result.controls_found?.filter(c => (selectedFramework === 'all' || c.mapped_framework === selectedFramework) && c.confidence_score >= 0.75).length || 0} theme={theme} />
              <TabButton active={activeTab === 'gaps'} onClick={() => setActiveTab('gaps')} label="Partial / Gaps" icon={<AlertTriangle size={16} />} count={result.controls_found?.filter(c => (selectedFramework === 'all' || c.mapped_framework === selectedFramework) && c.confidence_score < 0.75).length || 0} theme={theme} />
            </div>

            <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
              <Search size={18} color={theme.textMuted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Search mapped controls, evidence, frameworks..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%',
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${theme.border}`,
                  padding: '14px 20px 14px 48px',
                  borderRadius: '12px',
                  color: theme.textMain,
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = theme.accent}
                onBlur={(e) => e.target.style.borderColor = theme.border}
              />
            </div>
          </div>

          {/* Active Audit Scope Mismatch Warning Banner */}
          {auditedFramework && auditedFramework !== 'all' && selectedFramework !== auditedFramework && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)',
              border: `1px solid rgba(245, 158, 11, 0.25)`,
              borderRadius: '16px',
              padding: '20px 24px',
              marginBottom: '25px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '15px',
              boxShadow: `0 8px 32px rgba(245, 158, 11, 0.05)`,
              backdropFilter: 'blur(12px)',
              animation: 'fadeIn 0.4s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  padding: '8px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.amber}33`
                }}>
                  <AlertTriangle size={20} color={theme.amber} />
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '1rem', color: theme.textMain }}>
                    Active Audit Scope Mismatch
                  </div>
                  <div style={{ color: theme.textMuted, fontSize: '0.85rem', marginTop: '3px' }}>
                    The current audit was executed specifically targeting <strong style={{ color: theme.amber }}>{frameworks.find(f => f.id === auditedFramework)?.name}</strong>. Mappings for <strong style={{ color: theme.accent }}>{frameworks.find(f => f.id === selectedFramework)?.name}</strong> are not available in this report.
                  </div>
                </div>
              </div>
              <button 
                onClick={handleRunAgent}
                style={{
                  background: `linear-gradient(135deg, ${theme.amber} 0%, #D97706 100%)`,
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: `0 0 15px ${theme.amberGlow}`,
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Zap size={14} />
                <span>Execute Re-run for {frameworks.find(f => f.id === selectedFramework)?.name}</span>
              </button>
            </div>
          )}

          {/* Interactive Futuristic Matrix Grid */}
          <section style={{ marginBottom: '60px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Layers size={26} color={theme.accent} />
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: theme.textMain }}>
                  {selectedFramework === 'all' ? 'Interactive Compliance Matrix' : `${frameworks.find(f => f.id === selectedFramework)?.name} Compliance Matrix`}
                </h2>
              </div>
              <span style={{ color: theme.textMuted, fontSize: '0.9rem', fontWeight: '500' }}>Showing {filteredControls.length} of {result.controls_found?.length || 0} extracted vectors</span>
            </div>

            <div style={{
              background: theme.surfaceGlass,
              borderRadius: '24px',
              border: `1px solid ${theme.border}`,
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(16px)',
              width: '100%'
            }}>
              {/* Header Columns */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '110px 3.5fr 2.9fr 240px 200px',
                padding: '24px 30px',
                borderBottom: `2px solid ${theme.border}`,
                background: 'rgba(255,255,255,0.01)',
                fontWeight: '900',
                fontSize: '1.15rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: theme.textMuted
              }}>
                <div>ID</div>
                <div>Extracted Policy Evidence</div>
                <div style={{ textAlign: 'center' }}>Mapped Framework Controls</div>
                <div style={{ textAlign: 'center' }}>Confidence</div>
                <div style={{ textAlign: 'center' }}>Action</div>
              </div>

              {/* Table Rows */}
              {filteredControls.length > 0 ? (
                filteredControls.map((ctrl, i) => {
                  const isExpanded = expandedControl === i;
                  const confidencePercent = Math.round(ctrl.confidence_score * 100);
                  
                  // Color determination based on match accuracy
                  let matchColor = theme.emerald;
                  let matchGlow = theme.emeraldGlow;
                  if (confidencePercent < 60) {
                    matchColor = theme.red;
                    matchGlow = theme.redGlow;
                  } else if (confidencePercent < 80) {
                    matchColor = theme.amber;
                    matchGlow = theme.amberGlow;
                  }

                  return (
                    <div key={i} style={{ 
                      borderBottom: i === filteredControls.length - 1 ? 'none' : `1px solid ${theme.border}`,
                      background: isExpanded ? 'rgba(14, 165, 233, 0.02)' : 'transparent',
                      transition: 'all 0.25s ease'
                    }}
                    className="cyber-table-row"
                    >
                      {/* Base Row Panel */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '110px 3.5fr 2.9fr 240px 200px',
                        padding: '28px 30px',
                        alignItems: 'center',
                        fontSize: '1.2rem'
                      }}>
                        {/* ID */}
                        <div style={{ 
                          fontWeight: '800', 
                          color: theme.accent, 
                          fontFamily: "'Courier New', monospace",
                          fontSize: '1.2rem'
                        }}>
                          {ctrl.evidence_id}
                        </div>

                        {/* Evidence Text */}
                        <div style={{ 
                          paddingRight: '35px', 
                          fontWeight: '500',
                          lineHeight: '1.75',
                          fontSize: '1.2rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: isExpanded ? 'none' : '2',
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {ctrl.evidence_text}
                        </div>

                        {/* Mapped Framework Control */}
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '8px', 
                          alignItems: 'center',
                          textAlign: 'center'
                        }}>
                          <span style={{ fontWeight: '900', color: theme.textMain, fontSize: '1.35rem' }}>
                            {ctrl.mapped_framework}
                          </span>
                          <span style={{ 
                            fontSize: '1.1rem', 
                            color: theme.accent, 
                            fontWeight: '800',
                            fontFamily: "'Courier New', monospace"
                          }}>
                            {ctrl.framework_control_id}
                          </span>
                        </div>

                        {/* Confidence score visual indicator */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            background: `rgba(${confidencePercent < 60 ? '239,68,68' : confidencePercent < 80 ? '245,158,11' : '16,185,129'}, 0.1)`, 
                            color: matchColor, 
                            padding: '10px 24px', 
                            borderRadius: '100px', 
                            fontSize: '1.1rem', 
                            fontWeight: '900',
                            boxShadow: `0 0 12px ${matchGlow}`,
                            whiteSpace: 'nowrap'
                          }}>
                            {confidencePercent}% Match
                          </div>
                          
                          {/* Minimalist modern progress bar */}
                          <div style={{ width: '130px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${confidencePercent}%`, 
                              height: '100%', 
                              background: matchColor,
                              borderRadius: '3px'
                            }} />
                          </div>
                        </div>

                        {/* Expandable/Interactive Action */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button 
                            onClick={() => setExpandedControl(isExpanded ? null : i)}
                            style={{
                              background: isExpanded ? theme.accent : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${isExpanded ? theme.accent : theme.border}`,
                              color: isExpanded ? '#fff' : theme.textMain,
                              padding: '14px 28px',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '1.1rem',
                              fontWeight: '800',
                              transition: 'all 0.25s ease'
                            }}
                            onMouseOver={(e) => { if (!isExpanded) { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.background = 'rgba(14, 165, 233, 0.05)'; } }}
                            onMouseOut={(e) => { if (!isExpanded) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; } }}
                          >
                            <span>Details</span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Detailed Slide Down Section */}
                      {isExpanded && (
                        <div style={{ 
                          padding: '0 30px 30px 30px', 
                          animation: 'slideUp 0.3s ease-out',
                          background: 'rgba(255,255,255,0.005)'
                        }}>
                          <div style={{ 
                            background: '#04060E', 
                            borderRadius: '16px', 
                            border: `1px solid ${theme.border}`,
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px'
                          }}>
                            {/* Comparison block */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
                              <div>
                                <h4 style={{ color: theme.accent, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0', fontWeight: '800' }}>
                                  Parsed Policy Clause
                                </h4>
                                <div style={{ color: theme.textMain, background: 'rgba(255,255,255,0.01)', border: `1px solid rgba(255,255,255,0.03)`, padding: '16px', borderRadius: '10px', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                  "{ctrl.evidence_text}"
                                </div>
                              </div>

                              <div>
                                <h4 style={{ color: theme.purple, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0', fontWeight: '800' }}>
                                  Framework Definition ({ctrl.mapped_framework} - {ctrl.framework_control_id})
                                </h4>
                                <div style={{ color: theme.textMuted, background: 'rgba(255,255,255,0.01)', border: `1px solid rgba(255,255,255,0.03)`, padding: '16px', borderRadius: '10px', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                  {ctrl.framework_control_text || "The vector network matched this security practice with standard regulatory indexes verifying configuration requirements for authentication, telemetry logging, and asset access control scopes."}
                                </div>
                              </div>
                            </div>

                            {/* Remediation patches */}
                            <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Sparkles size={16} color={theme.amber} />
                                <span style={{ fontSize: '0.85rem', color: theme.textMuted }}>AI virtual CISO suggests:</span>
                                <span style={{ fontSize: '0.85rem', color: theme.amber, fontWeight: '700' }}>Enforce policy automation logs via infrastructure configurations.</span>
                              </div>
                              
                              <button style={{
                                background: `rgba(168, 85, 247, 0.1)`,
                                border: `1px solid ${theme.purple}55`,
                                color: theme.purple,
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = theme.purple; e.currentTarget.style.color = '#fff'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = `rgba(168, 85, 247, 0.1)`; e.currentTarget.style.color = theme.purple; }}
                              >
                                Generate Terraform Patch
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted }}>
                  <Eye size={40} opacity={0.3} style={{ marginBottom: '15px' }} />
                  <p style={{ margin: 0, fontWeight: '700' }}>No mapped controls match your current filters.</p>
                </div>
              )}
            </div>
          </section>

          {/* Futuristic Split Gaps & Roadmap sections */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '40px', width: '100%', marginBottom: '40px' }}>
            
            {/* Cyber Gaps Section */}
            <section style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                <ShieldAlert size={26} color={theme.red} />
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: theme.red, letterSpacing: '-0.02em' }}>Critical Compliance Gaps</h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {result.gaps_identified?.map((gap, i) => (
                  <div key={i} style={{ 
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)', 
                    padding: '24px', 
                    borderRadius: '16px', 
                    border: `1px solid rgba(239, 68, 68, 0.15)`,
                    boxShadow: `0 4px 15px rgba(239, 68, 68, 0.02)`,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  className="pulsing-gap-card"
                  >
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <AlertCircle size={24} color={theme.red} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', lineHeight: '1.5', color: '#FFBABA' }}>{gap}</p>
                        {result.open_risks?.[i] && (
                          <div style={{ 
                            marginTop: '15px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            background: 'rgba(239, 68, 68, 0.05)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: `1px solid rgba(239, 68, 68, 0.1)`
                          }}>
                            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '900', color: theme.red, background: `${theme.red}22`, padding: '3px 8px', borderRadius: '4px' }}>Exposure Liability</span>
                            <span style={{ fontSize: '0.85rem', color: theme.textMuted }}>{result.open_risks[i]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Cyber Roadmap Section */}
            <section style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                <Compass size={26} color={theme.emerald} />
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, color: theme.emerald, letterSpacing: '-0.02em' }}>Remediation Roadmap</h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {result.compliance_recommendations?.map((rec, i) => (
                  <div key={i} style={{ 
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)', 
                    padding: '24px', 
                    borderRadius: '16px', 
                    border: `1px solid rgba(16, 185, 129, 0.15)`,
                    display: 'flex',
                    gap: '18px',
                    alignItems: 'center',
                    boxShadow: `0 4px 15px rgba(16, 185, 129, 0.02)`
                  }}>
                    <div style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '50%', 
                      background: `rgba(16, 185, 129, 0.12)`, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      flexShrink: 0,
                      border: `1px solid ${theme.emerald}33`,
                      boxShadow: `0 0 10px ${theme.emeraldGlow}`
                    }}>
                      <span style={{ color: theme.emerald, fontWeight: '900', fontSize: '1rem' }}>{i + 1}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: '600', lineHeight: '1.5', color: '#D1FAE5' }}>{rec}</p>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      )}

      {/* Embedded Global Cyberpunk CSS Animations */}
      <style>{`
        /* Futuristic Cyber Grid background */
        .cyber-grid {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(rgba(14, 165, 233, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14, 165, 233, 0.02) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
          z-index: 1;
        }

        .radial-glow {
          position: absolute;
          top: -30%;
          left: 20%;
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 1;
        }

        .live-badge {
          background: rgba(14, 165, 233, 0.1);
          color: #0ea5e9;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid rgba(14, 165, 233, 0.3);
          box-shadow: 0 0 10px rgba(14, 165, 233, 0.2);
          animation: pulse 2s infinite;
        }

        .pulse-circle {
          width: 60px;
          height: 60px;
          background: rgba(14, 165, 233, 0.05);
          border-radius: 16px;
          display: flex;
          alignItems: center;
          justifyContent: center;
          border: 1px solid rgba(14, 165, 233, 0.2);
          box-shadow: 0 0 15px rgba(14, 165, 233, 0.1);
          animation: pulse 2.5s infinite;
        }

        /* Pulsing gap cards border */
        .pulsing-gap-card {
          animation: pulseGlow 3s infinite;
        }

        .cyber-table-row:hover {
          background: rgba(255,255,255,0.015) !important;
          box-shadow: inset 3px 0 0 #0ea5e9;
        }

        /* Radar animations */
        .radar-grid {
          position: relative;
          width: 60px;
          height: 60px;
          border: 1px solid rgba(14, 165, 233, 0.2);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.03) 0%, transparent 80%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .radar-sweep {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: conic-gradient(from 0deg, transparent 70%, rgba(14, 165, 233, 0.2) 100%);
          animation: spin 3s linear infinite;
        }

        .spinning-cpu {
          animation: spin 8s linear infinite;
        }

        /* Glow scanner lines */
        .glow-scanner {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #0ea5e9, transparent);
          box-shadow: 0 0 15px #0ea5e9;
          animation: scanVertical 4s linear infinite;
        }

        .terminal-scanline {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: rgba(14, 165, 233, 0.15);
          animation: scanVertical 8s linear infinite;
        }

        .blinking-cursor {
          animation: blink 1s step-end infinite;
        }

        .pulse-emerald {
          background: #10B981;
          padding: 8px;
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
          animation: pulse 1.8s infinite;
        }

        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 15px rgba(14, 165, 233, 0.4); }
          100% { transform: scale(1); opacity: 0.9; }
        }

        @keyframes pulseGlow {
          0% { border-color: rgba(239, 68, 68, 0.15); }
          50% { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 15px rgba(239, 68, 68, 0.05); }
          100% { border-color: rgba(239, 68, 68, 0.15); }
        }

        @keyframes scanVertical {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }

        @keyframes blink {
          from, to { opacity: 0 }
          50% { opacity: 1 }
        }
      `}</style>
    </div>
  );
};

const MetricDashboardCard = ({ icon, label, value, desc, color, glowColor, theme }) => (
  <div style={{ 
    background: theme.surfaceGlass, 
    padding: '30px', 
    borderRadius: '24px', 
    border: `1px solid ${theme.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(16px)',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: 'default'
  }}
  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 15px 40px ${glowColor}`; }}
  onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.3)'; }}
  >
    {/* Minimalist side glow ribbon */}
    <div style={{ 
      position: 'absolute', 
      top: '20px', 
      left: 0, 
      width: '3px', 
      height: '40px', 
      background: color,
      borderRadius: '0 4px 4px 0',
      boxShadow: `0 0 10px ${color}`
    }} />

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ 
        background: `rgba(${color === '#0EA5E9' ? '14,165,233' : color === '#F59E0B' ? '245,158,11' : '239,68,68'}, 0.08)`, 
        padding: '12px', 
        borderRadius: '14px',
        border: `1px solid ${color}33`,
        boxShadow: `0 0 15px ${glowColor}`
      }}>
        {icon}
      </div>
      <Activity size={18} color={theme.textMuted} opacity={0.15} />
    </div>

    <div>
      <p style={{ margin: '0 0 5px 0', color: theme.textMuted, fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
      <p style={{ margin: '0 0 10px 0', fontSize: '2.8rem', fontWeight: '900', color: theme.textMain, letterSpacing: '-0.02em' }}>
        {value}
      </p>
      <p style={{ margin: 0, color: theme.textMuted, fontSize: '0.85rem', lineHeight: '1.4' }}>
        {desc}
      </p>
    </div>
  </div>
);

const TabButton = ({ active, onClick, label, icon, count, theme }) => (
  <button 
    onClick={onClick}
    style={{
      background: active ? theme.accent : 'transparent',
      color: active ? '#fff' : theme.textMuted,
      border: 'none',
      padding: '10px 20px',
      borderRadius: '10px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '0.85rem',
      fontWeight: '700',
      transition: 'all 0.2s ease',
      boxShadow: active ? `0 0 15px ${theme.accentGlow}` : 'none'
    }}
  >
    {icon}
    <span>{label}</span>
    <span style={{
      background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
      color: active ? '#fff' : theme.textMuted,
      padding: '2px 8px',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: '800'
    }}>
      {count}
    </span>
  </button>
);

export default ComplianceAgent;