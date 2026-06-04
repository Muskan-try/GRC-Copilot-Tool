import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  getCurrentUser, 
  logout, 
  listOrgMembers, 
  getOrgDashboardData,
  inviteTeamMember,
  listPolicies,
  getProfile,
  setCurrentUser
} from "../api";
import { convertUSDToINR } from "../utils/currencyUtils";
import { 
  Users, 
  LayoutDashboard, 
  ShieldCheck, 
  TrendingUp, 
  LogOut, 
  Settings, 
  UserPlus, 
  FileText,
  ChevronRight,
  ArrowUpRight,
  Search,
  Mail,
  Bell,
  ChevronDown,
  Plus,
  Loader2,
  X,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Building,
  ArrowRight,
  BookOpen,
  Clock,
  Activity,
  HelpCircle,
  Menu,
  Globe
} from "lucide-react";
import { useToast } from "../components/Toast";

export default function OrgDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = getCurrentUser();

  // API Data States
  const [dashboardData, setDashboardData] = useState(null);
  const [members, setMembers] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  // UI Interactive States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'assessments' | 'policies' | 'team' | 'settings'
  const [showBanner, setShowBanner] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeRange, setTimeRange] = useState("week"); // 'day' | 'week' | 'month' | 'year'

  // Framework Status Modal
  const [fwModalOpen, setFwModalOpen] = useState(false);
  const [fwModalType, setFwModalType] = useState("");
  const [fwModalData, setFwModalData] = useState([]);

  // Invite Modal States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("team_lead");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Fetch Dashboard Metrics
  const fetchDashboardMetrics = async () => {
    if (!user || (user.role !== 'org_admin' && user.role !== 'owner')) {
      navigate("/");
      return;
    }

    try {
      // Sync profile data dynamically on fetch to ensure invited users detect real-time role/org updates immediately
      try {
        const profile = await getProfile();
        const storedUser = getCurrentUser();
        if (profile && (profile.organization?.org_id !== storedUser?.org_id || profile.role !== storedUser?.role)) {
          const updatedUser = {
            ...storedUser,
            org_id: profile.organization?.org_id,
            role: profile.role,
            email: profile.email
          };
          setCurrentUser(updatedUser);
          window.location.reload();
          return;
        }
      } catch (profileErr) {
        console.warn("Failed to sync profile context:", profileErr);
      }

      const orgMetrics = await getOrgDashboardData();
      setDashboardData(orgMetrics);

      const activeOrgId = user.org_id || getCurrentUser()?.org_id;
      if (activeOrgId) {
        const [membersPayload, policiesPayload] = await Promise.all([
          listOrgMembers(activeOrgId),
          listPolicies()
        ]);
        setMembers(membersPayload.members || []);
        setPolicies(policiesPayload.policies || []);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error loading dashboard metrics:", err);
      toast.addToast("Failed to fetch dashboard metrics", "error");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
    const interval = setInterval(fetchDashboardMetrics, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.addToast("Please provide a valid email address", "warning");
      return;
    }

    setInviteSubmitting(true);
    try {
      await inviteTeamMember(user.org_id, inviteEmail, inviteRole);
      toast.addToast(`Successfully sent invitation to ${inviteEmail}`, "success");
      
      const membersPayload = await listOrgMembers(user.org_id);
      setMembers(membersPayload.members || []);
      
      setInviteEmail("");
      setShowInviteModal(false);
    } catch (err) {
      toast.addToast(err.message || "Failed to invite team member", "error");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleFwClick = (type) => {
    if (type === 'active') {
      setFwModalType("Active Frameworks");
      setFwModalData(dashboardData?.frameworkAssessments || []);
    } else if (type === 'pending') {
      setFwModalType("Pending Audits");
      setFwModalData((dashboardData?.frameworkAssessments || []).filter(fw => fw.status !== 'complete'));
    } else if (type === 'overdue' || type === 'all') {
      setFwModalType("Critical Gaps Overdue");
      setFwModalData(dashboardData?.criticalGapsList || []);
    }
    setFwModalOpen(true);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, border: '3px solid #000000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Syncing compliance workspace...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const getUsername = (email) => email ? email.split('@')[0] : 'Administrator';
  const getOrgName = () => {
    const email = user?.email || "";
    const domain = email.split('@')[1];
    return domain ? domain.split('.')[0].toUpperCase() : "ORBIX";
  };

  // Filter assessments based on timeRange
  const getFilteredByTimeRange = (list) => {
    if (!list) return [];
    const now = new Date();
    return list.filter(item => {
      if (!item.created_at) return true;
      const created = new Date(item.created_at);
      const diffTime = Math.abs(now - created);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (timeRange === "day") {
        return diffDays <= 1;
      } else if (timeRange === "week") {
        return diffDays <= 7;
      } else if (timeRange === "month") {
        return diffDays <= 30;
      } else if (timeRange === "year") {
        return diffDays <= 365;
      }
      return true;
    });
  };

  const timeFilteredFrameworks = getFilteredByTimeRange(dashboardData?.frameworkAssessments || []);

  // Client-side search filters based on searchQuery and timeRange
  const filteredFrameworks = timeFilteredFrameworks.filter(fw => 
    fw.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    fw.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMembers = members.filter(m => 
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPolicies = policies.filter(p =>
    (p.policy_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.policy_type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.status || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const baseCompliance = timeFilteredFrameworks.length > 0
    ? parseFloat((timeFilteredFrameworks.reduce((acc, curr) => acc + curr.completion_percentage, 0) / timeFilteredFrameworks.length).toFixed(1))
    : 0.0;

  // Derived GRC Metrics
  const activeControlsCount = timeFilteredFrameworks.length > 0 
    ? timeFilteredFrameworks.length * 4 
    : (dashboardData?.uploadedPoliciesCount || 0) * 4;
  const completedAssessmentsCount = timeFilteredFrameworks.filter(fw => fw.status === 'complete').length;

  return (
    <div className="org-dashboard-container">
      {/* Dynamic CSS Styling Inject Block */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        
        .org-dashboard-container {
          font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
          min-height: 100vh;
          background: #ffffff;
          color: #1e293b;
          display: flex;
          width: 100%;
        }

        /* Sidebar Styling */
        .sidebar-panel {
          width: 280px;
          background: #f5f5f7;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          z-index: 40;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (max-width: 1200px) {
          .sidebar-panel {
            position: fixed;
            left: 0;
            top: 0;
            transform: translateX(-100%);
            box-shadow: 20px 0 25px -5px rgba(0, 0, 0, 0.05);
          }
          .sidebar-panel.open {
            transform: translateX(0);
          }
        }

        .mobile-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.15);
          backdrop-filter: blur(4px);
          z-index: 30;
        }

        .mobile-top-header {
          display: none;
          height: 64px;
          background: #ffffff;
          border-bottom: 1px solid #f1f5f9;
          padding: 0 20px;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 25;
          width: 100%;
        }

        @media (max-width: 1200px) {
          .mobile-top-header {
            display: flex;
          }
        }

        /* Main Area Layout */
        .workspace-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .workspace-content {
          flex: 1;
          padding: 40px;
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          .workspace-content {
            padding: 24px 16px;
          }
        }

        /* Stacking Grid */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          align-items: start;
        }

        @media (min-width: 1200px) {
          .dashboard-grid {
            grid-template-columns: 3fr 1.1fr;
            gap: 32px;
          }
        }

        /* 4 Card Single Frame Grid (separated by thin interior borders) */
        .perf-card-container {
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
          padding: 24px;
          display: grid;
          grid-template-columns: 1fr;
          row-gap: 24px;
        }

        @media (min-width: 768px) {
          .perf-card-container {
            grid-template-columns: 1fr 1fr;
            column-gap: 40px;
            row-gap: 28px;
          }
        }

        /* Quadrant interior borders */
        .perf-quad {
          padding: 8px 0;
        }

        @media (min-width: 768px) {
          .perf-quad-1 {
            border-bottom: 1px solid #f1f5f9;
            border-right: 1px solid #f1f5f9;
            padding-bottom: 24px;
            padding-right: 32px;
          }
          .perf-quad-2 {
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 24px;
            padding-left: 20px;
          }
          .perf-quad-3 {
            border-right: 1px solid #f1f5f9;
            padding-right: 32px;
            padding-top: 12px;
          }
          .perf-quad-4 {
            padding-left: 20px;
            padding-top: 12px;
          }
        }

        /* Interactive Sidebar Item button */
        .sidebar-item-btn {
          width: calc(100% - 32px);
          margin: 0 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: transparent;
          color: #64748b;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          text-align: left;
        }

        .sidebar-item-btn.active {
          background: #ffffff;
          color: #000000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          border: 1px solid #e2e8f0;
          font-weight: 800;
        }

        .sidebar-item-btn:hover:not(.active) {
          color: #000000;
          background: rgba(0, 0, 0, 0.03);
        }

        /* SVG rotation keyframe */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* ── 1. Layout & Sidebar (Left Side) ── */}
      <aside className={`sidebar-panel ${mobileMenuOpen ? 'open' : ''}`}>
        
        {/* Close Button for Mobile Drawer */}
        {mobileMenuOpen && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 20px 0 0' }}>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.2rem", fontWeight: "bold" }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Sidebar Search Bar (Shifted to the Top) */}
        <div style={{ padding: "24px 24px 16px 24px" }}>
          <div style={{ position: "relative" }}>
            <input 
              type="text" 
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab === "overview" && e.target.value !== "") {
                  setActiveTab("assessments");
                }
              }}
              style={{
                width: "100%",
                height: "36px",
                background: "#eef0f2",
                border: "none",
                borderRadius: "8px",
                padding: "0 32px 0 32px",
                fontSize: "0.85rem",
                outline: "none",
                boxSizing: "border-box",
                fontWeight: 500,
                color: "#1e293b"
              }}
            />
            <Search size={14} color="#94a3b8" style={{ position: "absolute", left: "10px", top: "11px" }} />
            <span style={{ position: "absolute", right: "10px", top: "9px", fontSize: "0.7rem", color: "#94a3b8", fontWeight: 800 }}>⌘K</span>
          </div>
        </div>

        {/* Sidebar Links */}
        <nav style={{ flex: 1, padding: "16px 0", display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 28px 8px 28px" }}>Menu</span>
          
          <button 
            onClick={() => { setActiveTab("overview"); setSearchQuery(""); setMobileMenuOpen(false); }}
            className={`sidebar-item-btn ${activeTab === "overview" ? "active" : ""}`}
          >
            <LayoutDashboard size={18} /> Overview
          </button>

          <button 
            onClick={() => { setActiveTab("assessments"); setSearchQuery(""); setMobileMenuOpen(false); }}
            className={`sidebar-item-btn ${activeTab === "assessments" ? "active" : ""}`}
          >
            <ShieldCheck size={18} /> Framework Assessments
          </button>

          <button 
            onClick={() => { setActiveTab("policies"); setSearchQuery(""); setMobileMenuOpen(false); }}
            className={`sidebar-item-btn ${activeTab === "policies" ? "active" : ""}`}
          >
            <FileText size={18} /> Uploaded Policies
          </button>

          <button 
            onClick={() => { setActiveTab("team"); setSearchQuery(""); setMobileMenuOpen(false); }}
            className={`sidebar-item-btn ${activeTab === "team" ? "active" : ""}`}
          >
            <Users size={18} /> Team Members
          </button>
        </nav>

        {/* Bottom Profile Card */}
        <div style={{ padding: "20px 24px", borderTop: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#000000",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.85rem"
              }}>
                {getUsername(user?.email)[0].toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {getUsername(user?.email)}
                </span>
                <span style={{ fontSize: "0.7rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.email || "orbix@mail.com"}
                </span>
              </div>
            </div>
            <ChevronDown size={14} color="#94a3b8" />
          </div>

          {/* Sub menu links for Profile */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "4px" }}>
            <button 
              onClick={() => { setActiveTab("settings"); setMobileMenuOpen(false); }}
              style={{ 
                width: "100%", 
                padding: "8px 12px", 
                background: activeTab === "settings" ? "#ffffff" : "none", 
                border: activeTab === "settings" ? "1px solid #cbd5e1" : "none", 
                display: "flex", 
                alignItems: "center", 
                gap: "8px", 
                fontSize: "0.8rem", 
                color: "#64748b", 
                cursor: "pointer", 
                borderRadius: "8px", 
                fontWeight: activeTab === "settings" ? 700 : 500,
                transition: "all 0.2s" 
              }}
            >
              <Settings size={14} /> Settings
            </button>
            <button 
              onClick={handleLogout}
              style={{ 
                width: "100%", 
                padding: "8px 12px", 
                background: "none", 
                border: "none", 
                display: "flex", 
                alignItems: "center", 
                gap: "8px", 
                fontSize: "0.8rem", 
                color: "#ef4444", 
                cursor: "pointer", 
                borderRadius: "8px", 
                fontWeight: 600,
                transition: "all 0.2s" 
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Dashboard Workspace ── */}
      <div className="workspace-wrapper">
        
        {/* Mobile Header (Hamburger Bar) */}
        <header className="mobile-top-header">
          <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#1e293b", letterSpacing: "-0.04em" }}>
            W<span style={{ color: "#ef4444" }}>I</span>ŌK
          </div>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            style={{ background: "none", border: "none", color: "#1e293b", cursor: "pointer", padding: 8 }}
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Workspace Content Area */}
        <main className="workspace-content">

          {/* TAB 1: OVERVIEW PANEL (WIŌK Dribbble High-Fidelity Aesthetic) */}
          {activeTab === "overview" && (
            <div className="dashboard-grid">
              
              {/* ── Center Column Area ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                
                {/* Header Action Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#1e293b", margin: 0, letterSpacing: "-0.04em" }}>
                    Hello, Admin!
                  </h1>
                </div>

                {/* Top Plan Alert Banner */}
                {showBanner && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: "12px",
                    gap: "16px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
                      <span>✨ Upgrade your plan to unlock advanced features</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <button 
                        onClick={() => toast.addToast("Premium tier subscription is coming soon!", "info")}
                        style={{
                          background: "#ffffff",
                          color: "#1e293b",
                          border: "1px solid #cbd5e1",
                          borderRadius: "20px",
                          padding: "6px 12px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          cursor: "pointer",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.03)"
                        }}
                      >
                        Select Plan ↗
                      </button>
                      <button 
                        onClick={() => setShowBanner(false)}
                        style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Overview Performance (4-Card Single Container Grid) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Overview performance</h3>
                    
                    {/* Time Tabs Switcher */}
                    <div style={{ display: "flex", padding: "2px", background: "#f1f5f9", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                      {['day', 'week', 'month', 'year'].map(t => (
                        <button
                          key={t}
                          onClick={() => setTimeRange(t)}
                          style={{
                            ...tabMiniStyle,
                            background: timeRange === t ? "#ffffff" : "transparent",
                            color: timeRange === t ? "#1e293b" : "#64748b",
                            boxShadow: timeRange === t ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: timeRange === t ? 800 : 600,
                            textTransform: "capitalize",
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4 Quadrants separated by thin borders */}
                  <div className="perf-card-container">
                    
                    {/* Card 1: Active Controls */}
                    <div className="perf-quad perf-quad-1">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={perfSubtitleStyle}>Active Controls</span>
                      </div>
                      <h4 style={perfTitleStyle}>{activeControlsCount}</h4>
                      <span style={perfDescStyle}>From last 72 (last 7 days)</span>
                    </div>

                    {/* Card 2: Completed Assessments */}
                    <div className="perf-quad perf-quad-2">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={perfSubtitleStyle}>Completed Assessments</span>
                      </div>
                      <h4 style={perfTitleStyle}>{completedAssessmentsCount}</h4>
                      <span style={perfDescStyle}>From last 72 (last 7 days)</span>
                    </div>

                    {/* Card 3: Documented Policies */}
                    <div className="perf-quad perf-quad-3">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={perfSubtitleStyle}>Documented Policies</span>
                      </div>
                      <h4 style={perfTitleStyle}>{dashboardData?.uploadedPoliciesCount || 0}</h4>
                      <span style={perfDescStyle}>From last 12 (last 7 days)</span>
                    </div>

                    {/* Card 4: Overall Compliance Score */}
                    <div className="perf-quad perf-quad-4">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={perfSubtitleStyle}>Overall Compliance Score</span>
                      </div>
                      <h4 style={perfTitleStyle}>{baseCompliance}%</h4>
                      <span style={perfDescStyle}>From last 72 (last 7 days)</span>
                    </div>

                  </div>

                </div>

                {/* ── 3-Column Executive Layout ── */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "24px",
                  marginTop: "8px"
                }}>
                  {/* Card 1: Compliance Hotspots */}
                  <div style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #f1f5f9",
                    padding: "24px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.01)"
                  }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1e293b", margin: "0 0 16px 0" }}>Compliance Hotspots</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {dashboardData?.domainHotspots && dashboardData.domainHotspots.length > 0 ? (
                        dashboardData.domainHotspots.map((hotspot, idx) => (
                          <div key={idx}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>{hotspot.domain}</span>
                              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: hotspot.score < 30 ? "#ef4444" : "#f59e0b" }}>{hotspot.score}%</span>
                            </div>
                            <div style={{ width: "100%", height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ width: `${hotspot.score}%`, height: "100%", background: hotspot.score < 30 ? "#ef4444" : "#f59e0b", borderRadius: "3px" }} />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 600 }}>No critical hotspots identified.</div>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Financial Impact Metric */}
                  <div style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1px solid #f1f5f9",
                    padding: "24px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.01)"
                  }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1e293b", margin: "0 0 16px 0" }}>Financial Impact</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      <div>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Est. Remediation Cost</span>
                        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ef4444", marginTop: "4px" }}>
                          ${(dashboardData?.financialImpact?.totalRemediationCostUsd || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, marginTop: "2px" }}>
                          ₹{convertUSDToINR(dashboardData?.financialImpact?.totalRemediationCostUsd || 0).toLocaleString()} INR
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Penalty Liability Saved</span>
                        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#10b981", marginTop: "4px" }}>
                          ${(dashboardData?.financialImpact?.penaltyLiabilitySavedUsd || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600, marginTop: "2px" }}>
                          ₹{convertUSDToINR(dashboardData?.financialImpact?.penaltyLiabilitySavedUsd || 0).toLocaleString()} INR
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Actionable Insights */}
                  <div style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: "1px dashed #cbd5e1",
                    padding: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: "12px",
                    color: "#94a3b8"
                  }}>
                    <ShieldCheck size={32} opacity={0.5} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Actionable Insights Engine</span>
                    <span style={{ fontSize: "0.7rem", textAlign: "center" }}>More predictive modules will be slotted here automatically based on assessment data.</span>
                  </div>
                </div>

              </div>

              {/* ── 3. Contextual Right Sidebar Panels ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

                {/* Middle Box: Framework Status (Products Match) */}
                <div style={rightPanelCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1e293b" }}>Framework Status</span>
                    <span onClick={() => handleFwClick('all')} style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 800, cursor: "pointer" }}>See All ➔</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <FrameworkStatusRow label="Active Frameworks" val={(dashboardData?.frameworkAssessments || []).length} onClick={() => handleFwClick('active')} />
                    <FrameworkStatusRow label="Pending Audits" val={(dashboardData?.frameworkAssessments || []).filter(fw => fw.status !== 'complete').length} onClick={() => handleFwClick('pending')} />
                    <FrameworkStatusRow label="Critical Gaps Overdue" val={dashboardData?.criticalGapsCount || 0} onClick={() => handleFwClick('overdue')} />
                  </div>
                </div>

                {/* Bottom Box: Recent Activities Flow */}
                <div style={rightPanelCardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1e293b" }}>Recent Activities</span>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 800, cursor: "pointer" }}>See All ➔</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
                      dashboardData.recentActivities.map((act, index) => (
                        <ActivityFlowRow 
                          key={index}
                          initials={act.initials} 
                          user={act.user} 
                          action={act.action} 
                          time={act.time} 
                        />
                      ))
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600, textAlign: "center", padding: "12px 0" }}>
                        No recent compliance activity recorded.
                      </span>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: FRAMEWORK ASSESSMENTS LIST */}
          {activeTab === "assessments" && (
            <div style={mainPanelCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Registered Compliance Assessments</h3>
                  <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 700 }}>Active continuous assurance audit frameworks</span>
                </div>
                <button 
                  onClick={() => navigate("/start")}
                  style={{ background: "#1e1e1e", color: "#ffffff", border: "none", borderRadius: "12px", padding: "10px 20px", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)" }}
                >
                  <Plus size={16} /> Configure New Assessment
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "2px solid #f1f5f9" }}>
                      <th style={thStyle}>ID</th>
                      <th style={thStyle}>Framework Name</th>
                      <th style={thStyle}>Audit Status</th>
                      <th style={thStyle}>Score Progress</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFrameworks.length > 0 ? (
                      filteredFrameworks.map((fw, idx) => (
                        <tr key={fw.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={tdStyle}>{idx + 1}</td>
                          <td style={{ ...tdStyle, fontWeight: 800, color: "#1e293b" }}>{fw.name}</td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              background: fw.status === "complete" ? "#dcfce7" : "#fef3c7",
                              color: fw.status === "complete" ? "#15803d" : "#d97706",
                              textTransform: "uppercase"
                            }}>
                              {fw.status}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "160px" }}>
                              <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden", flex: 1 }}>
                                <div style={{ width: `${fw.completion_percentage}%`, height: "100%", background: "#1e293b" }} />
                              </div>
                              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#334155" }}>{fw.completion_percentage}%</span>
                            </div>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            <button 
                              onClick={() => navigate(`/view-dashboard/${fw.id}`)}
                              style={{ padding: "6px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, color: "#475569", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", transition: "all 0.2s" }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = "#1e293b"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}
                            >
                              Explore <ArrowUpRight size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                          No assessments found matching search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: UPLOADED POLICIES */}
          {activeTab === "policies" && (
            <div style={mainPanelCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Documented Policies Vault</h3>
                  <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 700 }}>Active uploaded compliance policies and evidence controls</span>
                </div>
                <button 
                  onClick={() => navigate("/start")}
                  style={{ background: "#1e1e1e", color: "#ffffff", border: "none", borderRadius: "12px", padding: "10px 20px", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)" }}
                >
                  <Plus size={16} /> Upload New Policy
                </button>
              </div>

              {/* Policy list showcase */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {filteredPolicies.length > 0 ? (
                  filteredPolicies.map(p => (
                    <PolicyRow 
                      key={p.id} 
                      title={p.policy_name} 
                      file={p.file_url ? p.file_url.split(/[\\/]/).pop() : "policy_document.pdf"} 
                      score={p.compliance_score} 
                      status={p.status} 
                      date={p.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : "Recently"}
                      onClick={() => setSelectedPolicy(p)}
                    />
                  ))
                ) : (
                  <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                    No documented policies found matching search.
                  </div>
                )}
              </div>

              {/* ── POLICY DETAILS MODAL ── */}
              {selectedPolicy && (
                <div style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(15, 23, 42, 0.3)",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 100,
                  animation: "fadeIn 0.2s ease-out"
                }}>
                  <div style={{
                    background: "#ffffff",
                    borderRadius: "20px",
                    width: "90%",
                    maxWidth: "680px",
                    maxHeight: "90vh",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    border: "1px solid #cbd5e1",
                    animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}>
                    
                    {/* Modal Header */}
                    <div style={{
                      padding: "24px",
                      borderBottom: "1px solid #f1f5f9",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#f8fafc"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "8px",
                          background: selectedPolicy.status === "compliant" ? "#dcfce7" : "#fee2e2",
                          color: selectedPolicy.status === "compliant" ? "#15803d" : "#b91c1c",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <FileText size={20} />
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>
                            {selectedPolicy.policy_name}
                          </h3>
                          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                            Policy Hub Analysis Report
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedPolicy(null)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#94a3b8",
                          cursor: "pointer",
                          padding: "4px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#cbd5e1"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Modal Content */}
                    <div style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px" }}>
                      
                      {/* Metadata Grid */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "16px",
                        background: "#f8fafc",
                        padding: "16px",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0"
                      }}>
                        <div style={{ textAlign: "left" }}>
                          <span style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Policy Type</span>
                          <strong style={{ fontSize: "0.8rem", color: "#334155", display: "block", marginTop: "2px", textTransform: "capitalize" }}>
                            {selectedPolicy.policy_type || "Compulsory"}
                          </strong>
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <span style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Target Framework</span>
                          <strong style={{ fontSize: "0.8rem", color: "#334155", display: "block", marginTop: "2px" }}>
                            {selectedPolicy.ai_analysis_report?.targetFramework || "ISO 27001 / GDPR"}
                          </strong>
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <span style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Compliance Score</span>
                          <strong style={{ 
                            fontSize: "0.8rem", 
                            color: selectedPolicy.compliance_score >= 80 ? "#15803d" : selectedPolicy.compliance_score >= 50 ? "#b56006" : "#b91c1c", 
                            display: "block", 
                            marginTop: "2px",
                            fontWeight: 800
                          }}>
                            {selectedPolicy.compliance_score !== null ? `${parseFloat(selectedPolicy.compliance_score)}%` : "N/A"}
                          </strong>
                        </div>
                      </div>

                      {/* Status Banner */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "16px",
                        background: selectedPolicy.status === "compliant" ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)",
                        borderRadius: "12px",
                        border: `1px solid ${selectedPolicy.status === "compliant" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)"}`
                      }}>
                        {selectedPolicy.status === "compliant" ? (
                          <>
                            <CheckCircle2 size={24} color="#10b981" />
                            <div style={{ textAlign: "left" }}>
                              <strong style={{ fontSize: "0.85rem", color: "#065f46", display: "block" }}>Fully Compliant Policy</strong>
                              <span style={{ fontSize: "0.75rem", color: "#047857" }}>The AI Agent verified that this policy satisfies all framework control objectives.</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={24} color="#ef4444" />
                            <div style={{ textAlign: "left" }}>
                              <strong style={{ fontSize: "0.85rem", color: "#991b1b", display: "block" }}>Compliance Gaps Found</strong>
                              <span style={{ fontSize: "0.75rem", color: "#b91c1c" }}>Our GRC Compliance agent identified key omissions or weak controls in this document.</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Gaps section */}
                      {selectedPolicy.ai_analysis_report?.gaps && selectedPolicy.ai_analysis_report.gaps.length > 0 ? (
                        <div style={{ textAlign: "left" }}>
                          <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#1e293b", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                            <AlertTriangle size={16} color="#ef4444" /> Identified Compliance Gaps ({selectedPolicy.ai_analysis_report.gaps.length})
                          </h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {selectedPolicy.ai_analysis_report.gaps.map((gap, i) => (
                              <div key={i} style={{
                                padding: "12px",
                                background: "#fff5f5",
                                borderLeft: "4px solid #ef4444",
                                borderRadius: "0 8px 8px 0",
                                fontSize: "0.8rem",
                                color: "#991b1b",
                                lineHeight: 1.4
                              }}>
                                {gap}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Recommendations section */}
                      {selectedPolicy.ai_analysis_report?.recommendations && selectedPolicy.ai_analysis_report.recommendations.length > 0 ? (
                        <div style={{ textAlign: "left" }}>
                          <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#1e293b", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                            <CheckCircle2 size={16} color="#10b981" /> AI Remediations & Recommendations ({selectedPolicy.ai_analysis_report.recommendations.length})
                          </h4>
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {selectedPolicy.ai_analysis_report.recommendations.map((rec, i) => (
                              <div key={i} style={{
                                padding: "12px",
                                background: "#f0fdf4",
                                borderLeft: "4px solid #10b981",
                                borderRadius: "0 8px 8px 0",
                                fontSize: "0.8rem",
                                color: "#14532d",
                                lineHeight: 1.4
                              }}>
                                {rec}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                    </div>

                    {/* Modal Footer */}
                    <div style={{
                      padding: "16px 24px",
                      borderTop: "1px solid #f1f5f9",
                      background: "#f8fafc",
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "12px"
                    }}>
                      <button 
                        onClick={() => {
                          if (selectedPolicy.file_url) {
                            window.open(`${API_BASE.replace('/api', '')}/${selectedPolicy.file_url}`, '_blank');
                          }
                        }}
                        style={{
                          background: "#ffffff",
                          color: "#1e293b",
                          border: "1px solid #cbd5e1",
                          borderRadius: "10px",
                          padding: "8px 16px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        View Document
                      </button>
                      <button 
                        onClick={() => setSelectedPolicy(null)}
                        style={{
                          background: "#1e1e1e",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "10px",
                          padding: "8px 16px",
                          fontSize: "0.8rem",
                          fontWeight: 800,
                          cursor: "pointer"
                        }}
                      >
                        Close Report
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TEAM MEMBERS */}
          {activeTab === "team" && (
            <div style={mainPanelCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Organization Team Directory</h3>
                  <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 700 }}>Configure access for team leads and assessors</span>
                </div>
                <button 
                  onClick={() => setShowInviteModal(true)}
                  style={{ background: "#1e1e1e", color: "#ffffff", border: "none", borderRadius: "12px", padding: "10px 20px", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)" }}
                >
                  <Plus size={16} /> Invite New Delegate
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "2px solid #f1f5f9" }}>
                      <th style={thStyle}>Delegate</th>
                      <th style={thStyle}>Email Address</th>
                      <th style={thStyle}>Assigned Role</th>
                      <th style={thStyle}>Console Status</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => (
                        <tr key={member.user_id || member.email} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={tdStyle}>
                            <div style={{ 
                              width: "36px", 
                              height: "36px", 
                              borderRadius: "50%", 
                              background: member.role === "owner" ? "rgba(16, 185, 129, 0.08)" : member.role === "team_lead" ? "rgba(99, 102, 241, 0.08)" : "rgba(37, 99, 235, 0.08)", 
                              color: member.role === "owner" ? "#10b981" : member.role === "team_lead" ? "#6366f1" : "#2563eb", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              fontWeight: 800, 
                              fontSize: "0.85rem" 
                            }}>
                              {member.email[0].toUpperCase()}
                            </div>
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 800, color: "#1e293b" }}>{member.email}</td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              background: member.role === "owner" ? "rgba(16, 185, 129, 0.08)" : "rgba(248, 250, 252, 1)",
                              color: member.role === "owner" ? "#10b981" : "#64748b",
                              border: member.role === "owner" ? "none" : "1px solid #cbd5e1",
                              textTransform: "uppercase"
                            }}>
                              {member.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              background: member.status === "active" ? "#dcfce7" : "#fee2e2",
                              color: member.status === "active" ? "#15803d" : "#b91c1c",
                              textTransform: "uppercase"
                            }}>
                              {member.status}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            {member.role !== "owner" && (
                              <button 
                                onClick={() => toast.addToast("Member configurations are managed in Team settings", "info")}
                                style={{ padding: "6px 12px", background: "transparent", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, color: "#64748b", cursor: "pointer", transition: "all 0.2s" }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.color = "#1e293b"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.color = "#64748b"; }}
                              >
                                Manage Settings
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                          No delegates found matching search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS CONSOLE */}
          {activeTab === "settings" && (
            <div style={mainPanelCardStyle}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", marginBottom: "24px", borderBottom: "1px solid #cbd5e1", paddingBottom: "16px", letterSpacing: "-0.02em" }}>Organization Settings</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "600px" }}>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 800, color: "#475569" }}>Organization Name</label>
                  <input 
                    type="text" 
                    defaultValue={getOrgName() + " Shop"}
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 800, color: "#475569" }}>Primary Region</label>
                  <select style={inputStyle}>
                    <option>United States (US-East)</option>
                    <option>European Union (EU-West)</option>
                    <option>India (Asia-South)</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 800, color: "#475569" }}>Industry Classification</label>
                  <select style={inputStyle}>
                    <option>Technology & SaaS</option>
                    <option>Financial Services</option>
                    <option>Healthcare & Biotech</option>
                  </select>
                </div>

                <button 
                  onClick={() => toast.addToast("Organization configurations saved successfully!", "success")}
                  style={{
                    background: "#1e1e1e",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "12px 24px",
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    alignSelf: "flex-start",
                    marginTop: "12px",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.15)"
                  }}
                >
                  Save Changes
                </button>

              </div>
            </div>
          )}

        </main>
      </div>

      {/* ── FRAMEWORK STATUS MODAL ── */}
      {fwModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 20
        }}>
          <div style={{
            background: "#ffffff", borderRadius: "16px", padding: "32px",
            width: "100%", maxWidth: "500px", position: "relative",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)"
          }}>
            <button
              onClick={() => setFwModalOpen(false)}
              style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
            >
              <X size={20} />
            </button>
            <h3 style={{ margin: "0 0 24px 0", fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
              {fwModalType}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "400px", overflowY: "auto" }}>
              {fwModalData && fwModalData.length > 0 ? (
                fwModalData.map((item, i) => (
                  <div key={i} style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.95rem", marginBottom: "4px" }}>
                      {item.name || item.framework || "Unknown Framework"}
                    </div>
                    {item.status && (
                      <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                        Status: <span style={{ color: item.status === 'complete' ? '#10b981' : '#f59e0b' }}>{item.status}</span>
                      </div>
                    )}
                    {item.title && (
                      <div style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: 600 }}>
                        Gap: {item.title}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "#64748b", fontSize: "0.9rem" }}>
                  No items found.
                </div>
              )}
            </div>
            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setFwModalOpen(false)}
                style={{
                  padding: "10px 24px", background: "#f1f5f9", color: "#475569",
                  border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INTERACTIVE INVITE MODAL DIALOG ── */}
      {showInviteModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.2)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div 
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              width: "480px",
              padding: "32px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              border: "1px solid #cbd5e1"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <UserPlus size={20} color="#000000" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>Invite Team Delegate</h3>
              </div>
              <button 
                onClick={() => setShowInviteModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendInvite} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "#475569" }}>Delegate Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "#475569" }}>Assign Access Role</label>
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={inputStyle}
                >
                  <option value="team_lead">Team Lead (Can assign tasks, review controls)</option>
                  <option value="team_member">Team Member (Can execute controls, upload evidence)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "20px", marginTop: "10px" }}>
                <button 
                  type="button" 
                  onClick={() => setShowInviteModal(false)}
                  style={{ padding: "10px 20px", background: "none", border: "1px solid #cbd5e1", borderRadius: "10px", fontSize: "0.8rem", color: "#64748b", fontWeight: 800, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={inviteSubmitting}
                  style={{ padding: "10px 24px", background: "#1e1e1e", color: "#ffffff", border: "none", borderRadius: "10px", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 10px rgba(0,0,0,0.15)" }}
                >
                  {inviteSubmitting ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> Inviting...
                    </>
                  ) : (
                    <>
                      Send Invite
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

// ─── HELPER COMPONENT STYLES ───────────────────────────────────────────

const mainPanelCardStyle = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "32px",
  boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.01)",
  border: "1px solid #cbd5e1"
};

const rightPanelCardStyle = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "24px",
  boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.01)",
  border: "1px solid #cbd5e1",
  display: "flex",
  flexDirection: "column"
};

const tabMiniStyle = {
  fontSize: "0.75rem",
  fontWeight: 800,
  color: "#64748b",
  padding: "6px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  transition: "all 0.2s"
};

const perfSubtitleStyle = {
  fontSize: "0.8rem",
  fontWeight: 800,
  color: "#94a3b8",
  letterSpacing: "0.02em"
};

const perfBadgeStyle = {
  fontSize: "0.7rem",
  fontWeight: 800,
  color: "#15803d",
  background: "#dcfce7",
  padding: "2px 8px",
  borderRadius: "6px"
};

const perfTitleStyle = {
  fontSize: "1.85rem",
  fontWeight: 800,
  color: "#1e293b",
  margin: "12px 0 6px 0",
  letterSpacing: "-0.04em"
};

const perfDescStyle = {
  fontSize: "0.75rem",
  color: "#94a3b8",
  fontWeight: 700
};

const thStyle = {
  padding: "16px 12px",
  color: "#94a3b8",
  fontSize: "0.75rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em"
};

const tdStyle = {
  padding: "20px 12px",
  fontSize: "0.85rem",
  color: "#475569"
};

const inputStyle = {
  width: "100%",
  height: "44px",
  padding: "0 16px",
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  fontSize: "0.85rem",
  color: "#1e293b",
  outline: "none",
  boxSizing: "border-box",
  fontWeight: 500
};

// ─── HELPER SUB-COMPONENTS ─────────────────────────────────────────────

function FrameworkStatusRow({ label, val, onClick }) {
  return (
    <div 
      onClick={onClick}
      style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "12px 10px", borderBottom: "1px solid #f1f5f9",
        cursor: onClick ? "pointer" : "default",
        borderRadius: "6px",
        transition: "background 0.2s ease"
      }}
      onMouseOver={(e) => onClick && (e.currentTarget.style.background = "#f8fafc")}
      onMouseOut={(e) => onClick && (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ fontSize: "0.85rem", color: "#475569", fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b" }}>{val}</span>
    </div>
  );
}

function ActivityFlowRow({ initials, user, action, time }) {
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "start" }}>
      <div style={{ position: "relative" }}>
        <div style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: "#f1f5f9",
          color: "#475569",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: "0.75rem",
          border: "1px solid #cbd5e1"
        }}>
          {initials}
        </div>
        <div style={{
          position: "absolute",
          bottom: "-2px",
          right: "-2px",
          width: "12px",
          height: "12px",
          background: "#ef4444",
          border: "2px solid #ffffff",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "6px",
          color: "#ffffff"
        }}>♥</div>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "0.8rem", color: "#334155", margin: 0, lineHeight: 1.4 }}>
          <strong style={{ fontWeight: 800 }}>{user}</strong> {action}
        </p>
        <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700 }}>{time}</span>
      </div>
    </div>
  );
}

function PolicyRow({ title, file, score, status, date, onClick }) {
  const isCompliant = status === 'compliant';
  const hasGaps = status === 'gaps_found';
  
  // Status Pill Styles
  let statusBg = "#f1f5f9";
  let statusColor = "#64748b";
  let statusLabel = "Analyzing";
  
  if (isCompliant) {
    statusBg = "#dcfce7";
    statusColor = "#15803d";
    statusLabel = "Compliant";
  } else if (hasGaps) {
    statusBg = "#fee2e2";
    statusColor = "#b91c1c";
    statusLabel = "Gaps Found";
  }

  // Score Badge
  const scoreVal = score !== null && score !== undefined ? parseFloat(score) : null;
  let scoreColor = "#64748b";
  let scoreBg = "#f1f5f9";
  if (scoreVal !== null) {
    if (scoreVal >= 80) {
      scoreBg = "#dcfce7";
      scoreColor = "#15803d";
    } else if (scoreVal >= 50) {
      scoreBg = "#fef3c7";
      scoreColor = "#b56006";
    } else {
      scoreBg = "#fee2e2";
      scoreColor = "#b91c1c";
    }
  }

  return (
    <div 
      onClick={onClick}
      style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "16px 20px", 
        background: "#ffffff", 
        borderRadius: "14px", 
        border: "1px solid #cbd5e1",
        cursor: "pointer",
        transition: "all 0.2s ease-in-out",
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.06)";
        e.currentTarget.style.borderColor = "#1e293b";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
        e.currentTarget.style.borderColor = "#cbd5e1";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ 
          width: "44px", 
          height: "44px", 
          borderRadius: "10px", 
          background: "#f8fafc", 
          border: "1px solid #cbd5e1", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          color: hasGaps ? "#ef4444" : isCompliant ? "#22c55e" : "#64748b" 
        }}>
          <FileCheck size={22} />
        </div>
        <div style={{ textAlign: "left" }}>
          <strong style={{ fontSize: "0.9rem", color: "#1e293b", display: "block", fontWeight: 800 }}>{title}</strong>
          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>{file}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", textAlign: "right" }}>
        <div>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 700, display: "block" }}>{date}</span>
          <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
            {scoreVal !== null && (
              <span style={{
                fontSize: "0.65rem",
                fontWeight: 800,
                background: scoreBg,
                color: scoreColor,
                padding: "2px 6px",
                borderRadius: "6px",
                textTransform: "uppercase"
              }}>
                Score: {scoreVal}%
              </span>
            )}
            <span style={{
              fontSize: "0.65rem",
              fontWeight: 800,
              background: statusBg,
              color: statusColor,
              padding: "2px 6px",
              borderRadius: "6px",
              textTransform: "uppercase"
            }}>
              {statusLabel}
            </span>
          </div>
        </div>
        <ChevronRight size={18} color="#cbd5e1" style={{ marginLeft: "4px" }} />
      </div>
    </div>
  );
}
