import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout, API_BASE } from "../api";
import { 
  Users, 
  Building2, 
  ShieldCheck, 
  Activity, 
  LogOut, 
  Settings, 
  Search, 
  AlertCircle,
  Clock,
  MoreVertical,
  ExternalLink,
  Mail,
  Bell,
  ChevronDown
} from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [activeTab, setActiveTab] = useState("overview");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Interactive UI states for top header controls
  const [showMessages, setShowMessages] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem("grc_auth_token");
      const res = await fetch(`${API_BASE}/admin/dashboard-data`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to load admin stats");
      const data = await res.json();
      setDashboardData(data);
      setLoading(false);
    } catch (err) {
      console.error("Error loading admin stats:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate("/");
      return;
    }
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 8000);
    return () => clearInterval(interval);
  }, [currentUser, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery(""); // Clear search query upon switching tabs
    setShowMessages(false);
    setShowNotifications(false);
    setShowSettings(false);
    setShowProfile(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f6f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Loading administrator panel...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Extract username from email
  const getUsername = (email) => email ? email.split('@')[0] : 'Administrator';

  // Client-side search filters
  const filteredUsers = (dashboardData?.allUsers || []).filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#f3f4f6", 
      color: "#1e293b", 
      display: "flex",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* ── Sidebar ── */}
      <aside style={{ 
        width: "280px", 
        background: "#ffffff", 
        borderRight: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh"
      }}>
        {/* Coral/Red Gradient Logo Area */}
        <div style={{ 
          height: "64px",
          background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
          display: "flex", 
          alignItems: "center", 
          padding: "0 24px",
          gap: "12px",
          color: "#ffffff"
        }}>
          <div style={{ 
            fontSize: "1.3rem", 
            fontWeight: 800, 
            letterSpacing: "0.02em",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            Hi, Admin
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav style={{ flex: 1, padding: "24px 0" }}>
          <SidebarItem active={activeTab === "overview"} onClick={() => handleTabChange("overview")} icon={<Activity size={18} />} label="Dashboard" />
          <SidebarItem active={activeTab === "tables"} onClick={() => handleTabChange("tables")} icon={<Building2 size={18} />} label="Tables Basic" />
          <SidebarItem active={activeTab === "notifications"} onClick={() => handleTabChange("notifications")} icon={<AlertCircle size={18} />} label="Notifications" />
          <SidebarItem active={activeTab === "components"} onClick={() => handleTabChange("components")} icon={<Settings size={18} />} label="Components" />
        </nav>

        {/* Logout Bottom */}
        <div style={{ padding: "24px", borderTop: "1px solid #f1f5f9" }}>
          <button 
            onClick={handleLogout}
            style={{ 
              width: "100%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              gap: "10px", 
              padding: "12px", 
              background: "rgba(239, 68, 68, 0.08)", 
              color: "#dc2626", 
              border: "none", 
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.875rem",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"; }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* Top Navbar Header */}
        <header style={{
          height: "64px",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          position: "sticky",
          top: 0,
          zIndex: 10
        }}>
          {/* Top Search Input */}
          <div style={{ position: "relative", width: "320px" }}>
            <input 
              type="text" 
              placeholder={`Search in ${activeTab === 'overview' ? 'users' : activeTab === 'tables' ? 'organizations' : activeTab === 'notifications' ? 'audit logs' : 'dashboard'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: "40px",
                padding: "0 16px 0 40px",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "20px",
                fontSize: "0.875rem",
                color: "#1e293b",
                outline: "none"
              }}
            />
            <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "12px" }} />
          </div>

          {/* Right Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            {/* Messages Icon */}
            <div style={{ position: "relative" }}>
              <div 
                onClick={() => {
                  setShowMessages(!showMessages);
                  setShowNotifications(false);
                  setShowSettings(false);
                  setShowProfile(false);
                }}
                style={{ position: "relative", cursor: "pointer", color: showMessages ? "#ef4444" : "#64748b", transition: "color 0.2s" }}
              >
                <Mail size={20} />
                <span style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  padding: "2px 5px",
                  borderRadius: "10px",
                  lineHeight: 1
                }}>3</span>
              </div>

              {showMessages && (
                <div style={{
                  position: "absolute",
                  top: "35px",
                  right: "-120px",
                  width: "320px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                  zIndex: 100,
                  overflow: "hidden"
                }}>
                  <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: 700, fontSize: "0.85rem", color: "#334155" }}>
                    Recent Messages
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <DropdownItem 
                      title="Failed Login Attempt" 
                      desc="IP 192.168.1.45 failed authentication 3 times." 
                      time="2m ago" 
                      isNew 
                    />
                    <DropdownItem 
                      title="Acme Corp Registered" 
                      desc="New organization 'Acme Corp' added successfully." 
                      time="1h ago" 
                      isNew 
                    />
                    <DropdownItem 
                      title="Backup Completed" 
                      desc="Daily automated database backup finished without errors." 
                      time="5h ago" 
                    />
                  </div>
                  <div style={{ padding: "8px 16px", borderTop: "1px solid #e2e8f0", textAlign: "center", background: "#f8fafc" }}>
                    <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 700, cursor: "pointer" }} onClick={() => setShowMessages(false)}>
                      Close Panel
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Icon */}
            <div style={{ position: "relative" }}>
              <div 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowMessages(false);
                  setShowSettings(false);
                  setShowProfile(false);
                }}
                style={{ position: "relative", cursor: "pointer", color: showNotifications ? "#ef4444" : "#64748b", transition: "color 0.2s" }}
              >
                <Bell size={20} />
                <span style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  background: "#ef4444",
                  color: "#ffffff",
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  padding: "2px 5px",
                  borderRadius: "10px",
                  lineHeight: 1
                }}>3</span>
              </div>

              {showNotifications && (
                <div style={{
                  position: "absolute",
                  top: "35px",
                  right: "-80px",
                  width: "320px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                  zIndex: 100,
                  overflow: "hidden"
                }}>
                  <div style={{ padding: "12px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontWeight: 700, fontSize: "0.85rem", color: "#334155" }}>
                    System Alerts
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <DropdownItem 
                      title="Framework Score" 
                      desc={`Posture is currently at ${dashboardData?.systemPosture || 98.2}%.`} 
                      time="Warning" 
                      type="warning" 
                    />
                    <DropdownItem 
                      title="PostgreSQL Online" 
                      desc="Relational DB is fully active & responsive." 
                      time="Success" 
                      type="success" 
                    />
                    <DropdownItem 
                      title="FastAPI Engine Active" 
                      desc="Compliance parsing services are responding successfully." 
                      time="Info" 
                      type="info" 
                    />
                  </div>
                  <div style={{ padding: "8px 16px", borderTop: "1px solid #e2e8f0", textAlign: "center", background: "#f8fafc" }}>
                    <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 700, cursor: "pointer" }} onClick={() => setShowNotifications(false)}>
                      Close Panel
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Gear */}
            <div style={{ position: "relative" }}>
              <div 
                onClick={() => {
                  setShowSettings(!showSettings);
                  setShowMessages(false);
                  setShowNotifications(false);
                  setShowProfile(false);
                }}
                style={{ cursor: "pointer", color: showSettings ? "#ef4444" : "#64748b", transition: "color 0.2s" }}
              >
                <Settings size={20} />
              </div>

              {showSettings && (
                <div style={{
                  position: "absolute",
                  top: "35px",
                  right: "-40px",
                  width: "280px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                  zIndex: 100,
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                    Console Settings
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "#475569" }}>System Audit Level</span>
                    <select style={{ fontSize: "0.75rem", padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
                      <option>Verbose</option>
                      <option>Standard</option>
                      <option>Minimal</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "#475569" }}>Auto Refresh</span>
                    <input type="checkbox" defaultChecked style={{ cursor: "pointer" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "#475569" }}>Maintenance Mode</span>
                    <input type="checkbox" style={{ cursor: "pointer" }} />
                  </div>
                  <div style={{ padding: "8px 0 0 0", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end" }}>
                    <button 
                      onClick={() => setShowSettings(false)}
                      style={{ background: "#ef4444", color: "#ffffff", border: "none", borderRadius: "4px", padding: "6px 12px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Vertical Divider */}
            <div style={{ width: "1px", height: "24px", background: "#e2e8f0" }} />

            {/* Profile Dropdown */}
            <div style={{ position: "relative" }}>
              <div 
                onClick={() => {
                  setShowProfile(!showProfile);
                  setShowMessages(false);
                  setShowNotifications(false);
                  setShowSettings(false);
                }}
                style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80" 
                  alt="Avatar"
                  style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }}
                />
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#475569" }}>
                  {getUsername(currentUser?.email)}
                </span>
                <ChevronDown size={14} color="#94a3b8" style={{ transform: showProfile ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
              </div>

              {showProfile && (
                <div style={{
                  position: "absolute",
                  top: "45px",
                  right: 0,
                  width: "220px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                  zIndex: 100,
                  overflow: "hidden"
                }}>
                  <div style={{ padding: "16px", borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "block" }}>
                      {getUsername(currentUser?.email)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginTop: "2px" }}>
                      {currentUser?.email}
                    </span>
                    <span style={{
                      display: "inline-block",
                      marginTop: "8px",
                      background: "rgba(239, 68, 68, 0.08)",
                      color: "#dc2626",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      textTransform: "uppercase"
                    }}>
                      {currentUser?.role || "Admin"}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <button 
                      onClick={() => { setShowProfile(false); handleTabChange("components"); }}
                      style={{ width: "100%", padding: "10px 16px", background: "none", border: "none", textAlign: "left", fontSize: "0.8rem", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                    >
                      <Settings size={14} /> Account Settings
                    </button>
                    <button 
                      onClick={handleLogout}
                      style={{ width: "100%", padding: "12px 16px", background: "rgba(239, 68, 68, 0.04)", border: "none", textAlign: "left", fontSize: "0.8rem", color: "#dc2626", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.04)"}
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
          
          {/* Breadcrumb Indicator */}
          <div style={{ 
            fontSize: "0.75rem", 
            fontWeight: 700, 
            color: "#94a3b8", 
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "12px"
          }}>
            YOU ARE HERE &gt; {activeTab === "overview" ? "Dashboard" : activeTab}
          </div>

          <h2 style={{ 
            fontSize: "2.25rem", 
            fontWeight: 300, 
            color: "#475569", 
            marginBottom: "32px",
            letterSpacing: "-0.02em",
            textTransform: "capitalize"
          }}>
            {activeTab === "overview" ? "Dashboard" : activeTab.replace("-", " ")}
          </h2>

          {/* ── Tab Switcher ── */}
          {activeTab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "32px", alignItems: "start" }}>
              
              {/* ── LEFT COLUMN ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                
                {/* Card 1: Users Table */}
                <section style={{ 
                  background: "#ffffff", 
                  borderRadius: "8px", 
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                }}>
                  <div style={{ 
                    padding: "20px 24px", 
                    borderBottom: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#475569", fontWeight: 700 }}>
                      <Users size={18} />
                      <span>Users</span>
                    </div>

                    {/* Local Card Search */}
                    <input 
                      type="text" 
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        padding: "6px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        outline: "none",
                        width: "160px"
                      }}
                    />
                  </div>

                  <div style={{ padding: "24px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "2px solid #f1f5f9" }}>
                          <th style={{ padding: "12px 10px", color: "#64748b", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>ID</th>
                          <th style={{ padding: "12px 10px", color: "#64748b", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>Username</th>
                          <th style={{ padding: "12px 10px", color: "#64748b", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>Email</th>
                          <th style={{ padding: "12px 10px", color: "#64748b", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((u, i) => (
                            <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "16px 10px", fontSize: "0.875rem", color: "#64748b" }}>{i + 1}</td>
                              <td style={{ padding: "16px 10px", fontSize: "0.875rem", fontWeight: 600, color: "#334155" }}>{getUsername(u.email)}</td>
                              <td style={{ padding: "16px 10px", fontSize: "0.875rem", color: "#64748b" }}>{u.email}</td>
                              <td style={{ padding: "16px 10px" }}>
                                <span style={{
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  textTransform: "lowercase",
                                  background: u.is_active ? "#dcfce7" : "#fee2e2",
                                  color: u.is_active ? "#15803d" : "#b91c1c"
                                }}>
                                  {u.is_active ? 'active' : 'removed'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: "0.875rem" }}>
                              No matching users found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Card 2: Latest Organizations (Recent Posts Style) */}
                <section style={{ 
                  background: "#ffffff", 
                  borderRadius: "8px", 
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  padding: "24px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#334155", margin: 0 }}>Latest Registered Organizations</h3>
                      <span style={{ background: "#22c55e", color: "#ffffff", fontSize: "0.75rem", fontWeight: 800, padding: "2px 6px", borderRadius: "10px" }}>
                        {dashboardData?.activeOrganizations || 0}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}>Options</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                    {(dashboardData?.latestOrganizations || []).map((org) => (
                      <div key={org.id} style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ width: "100px", fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600 }}>
                          {org.created_at ? new Date(org.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                        <div style={{ flex: 1, fontSize: "0.875rem", fontWeight: 600, color: "var(--primary)" }}>
                          {org.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          by {org.creator_email}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button 
                      onClick={() => setActiveTab("tables")}
                      style={{
                        background: "#ef4444",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "8px 16px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      View all Organizations <span style={{ background: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: "10px" }}>{dashboardData?.activeOrganizations || 0}</span>
                    </button>
                  </div>
                </section>

              </div>

              {/* ── RIGHT COLUMN ── */}
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                
                {/* Card 3: Security & Posture Alerts */}
                <section style={{ 
                  background: "#ffffff", 
                  borderRadius: "8px", 
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  padding: "24px"
                }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#334155", margin: "0 0 20px 0" }}>Alerts</h3>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Warning: Posture status */}
                    <div style={{
                      padding: "16px",
                      background: "#fef9c3",
                      borderLeft: "4px solid #ca8a04",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      color: "#713f12"
                    }}>
                      Warning: Average framework compliance posture is currently at <strong>{dashboardData?.systemPosture || 98.2}%</strong>.
                    </div>

                    {/* Success: DB status */}
                    <div style={{
                      padding: "16px",
                      background: "#dcfce7",
                      borderLeft: "4px solid #15803d",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      color: "#14532d"
                    }}>
                      Success: PostgreSQL relational database is active and securely online.
                    </div>

                    {/* Info: Server status */}
                    <div style={{
                      padding: "16px",
                      background: "#dbeafe",
                      borderLeft: "4px solid #1d4ed8",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      color: "#1e3a8a"
                    }}>
                      Info: FastAPI compliance analysis engine is responding successfully.
                    </div>

                    {/* Danger: Critical events */}
                    <div style={{
                      padding: "16px",
                      background: "#fee2e2",
                      borderLeft: "4px solid #b91c1c",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      color: "#7f1d1d"
                    }}>
                      <div style={{ marginBottom: "12px" }}>
                        Danger: Multiple GRC audit activities logged in the last 24h.
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                          onClick={() => setActiveTab("notifications")}
                          style={{ background: "#dc2626", color: "#ffffff", border: "none", borderRadius: "3px", padding: "4px 10px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          Take this action
                        </button>
                        <button style={{ background: "transparent", color: "#dc2626", border: "1px solid #dc2626", borderRadius: "3px", padding: "4px 10px", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Card 4: GRC Telemetry Stats List */}
                <section style={{ 
                  background: "#ffffff", 
                  borderRadius: "8px", 
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  padding: "24px"
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <TelemetryItem label="Active Organizations" count={dashboardData?.activeOrganizations || 0} color="#ef4444" />
                    <TelemetryItem label="Total Users" count={dashboardData?.totalUsers || 0} color="#ca8a04" />
                    <TelemetryItem label="Security Events" count={dashboardData?.securityEventsCount || 0} color="#10b981" />
                    <TelemetryItem label="Visits total" count="Live" color="#3b82f6" />
                    <TelemetryItem label="Inbox" count="0" color="#64748b" />
                  </div>
                </section>

              </div>

            </div>
          )}

          {activeTab === "tables" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              <section style={{ 
                background: "#ffffff", 
                borderRadius: "8px", 
                border: "1px solid #e2e8f0", 
                padding: "32px", 
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)" 
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#334155", margin: 0 }}>Registered Organizations Database</h3>
                  <input 
                    type="text" 
                    placeholder="Search organizations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      fontSize: "0.8rem",
                      outline: "none",
                      width: "200px"
                    }}
                  />
                </div>
                
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "2px solid #f1f5f9" }}>
                      <th style={{ padding: "12px 10px", color: "#64748b", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>ID</th>
                      <th style={{ padding: "12px 10px", color: "#64748b", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>Organization Name</th>
                      <th style={{ padding: "12px 10px", color: "#64748b", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>Register Date</th>
                      <th style={{ padding: "12px 10px", color: "#64748b", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase" }}>Creator Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData?.allOrganizations || [])
                      .filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()) || o.creator_email.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((org, i) => (
                        <tr key={org.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "16px 10px", fontSize: "0.875rem", color: "#64748b" }}>{i + 1}</td>
                          <td style={{ padding: "16px 10px", fontSize: "0.875rem", fontWeight: 700, color: "var(--primary)" }}>{org.name}</td>
                          <td style={{ padding: "16px 10px", fontSize: "0.875rem", color: "#64748b" }}>{org.created_at ? new Date(org.created_at).toLocaleString() : 'N/A'}</td>
                          <td style={{ padding: "16px 10px", fontSize: "0.875rem", color: "#64748b" }}>{org.creator_email}</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {activeTab === "notifications" && (
            <div style={{ 
              background: "#ffffff", 
              borderRadius: "8px", 
              border: "1px solid #e2e8f0", 
              padding: "40px", 
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)" 
            }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#334155", marginBottom: "24px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>Latest Audit Events</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {(dashboardData?.allAuditLogs || [])
                  .filter(log => 
                    log.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    log.resource_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (log.user_email || '').toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((log) => (
                  <div key={log.id} style={{
                    padding: "16px",
                    background: "#f8fafc",
                    borderLeft: `4px solid ${log.action.includes('LOGIN') ? '#10b981' : '#3b82f6'}`,
                    borderRadius: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                        {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                      </span>
                      <strong style={{ fontSize: "0.95rem", color: "#1e293b" }}>{log.action.replace(/_/g, ' ')}</strong>
                      <span style={{ fontSize: "0.85rem", color: "#64748b", marginLeft: "12px" }}>Resource: {log.resource_type} ({log.resource_id || 'N/A'})</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.85rem", color: "#334155", fontWeight: 600, display: "block" }}>{log.user_email || 'System'}</span>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>IP: {log.ip_address || '127.0.0.1'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "components" && (
            <div style={{ 
              background: "#ffffff", 
              borderRadius: "8px", 
              border: "1px solid #e2e8f0", 
              padding: "40px", 
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)" 
            }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#334155", marginBottom: "24px", borderBottom: "1px solid #f1f5f9", paddingBottom: "16px" }}>GRC UI Component Library</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                {/* Button styles */}
                <div>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 700, display: "block", marginBottom: "12px" }}>Alert Preset Buttons</span>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <button style={{ padding: "8px 16px", background: "#ef4444", color: "#ffffff", border: "none", borderRadius: "4px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>Danger Action</button>
                    <button style={{ padding: "8px 16px", background: "#22c55e", color: "#ffffff", border: "none", borderRadius: "4px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>Success Action</button>
                    <button style={{ padding: "8px 16px", background: "#3b82f6", color: "#ffffff", border: "none", borderRadius: "4px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>Info Action</button>
                    <button style={{ padding: "8px 16px", background: "transparent", border: "1px solid #cbd5e1", color: "#64748b", borderRadius: "4px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>Cancel Action</button>
                  </div>
                </div>

                {/* Progress bars */}
                <div>
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 700, display: "block", marginBottom: "12px" }}>Compliance Telemetry Gauges</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "300px" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, marginBottom: "4px", color: "#64748b" }}>
                        <span>High Telemetry Target</span>
                        <span>98.2%</span>
                      </div>
                      <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: "98.2%", height: "100%", background: "#ef4444" }}></div>
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, marginBottom: "4px", color: "#64748b" }}>
                        <span>Current Posture</span>
                        <span>{dashboardData?.systemPosture || 62}%</span>
                      </div>
                      <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${dashboardData?.systemPosture || 62}%`, height: "100%", background: "#ca8a04" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

function SidebarItem({ active, icon, label, onClick }) {
  return (
    <button 
      onClick={onClick}
      style={{ 
        width: "100%", 
        display: "flex", 
        alignItems: "center", 
        gap: "12px", 
        padding: "16px 28px", 
        background: active ? "rgba(239, 68, 68, 0.04)" : "transparent", 
        color: active ? "#dc2626" : "#64748b", 
        border: "none", 
        borderLeft: active ? "4px solid #dc2626" : "4px solid transparent",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: "0.9rem",
        transition: "all 0.2s ease",
        textAlign: "left"
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = "#dc2626";
          e.currentTarget.style.background = "rgba(239, 68, 68, 0.02)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = "#64748b";
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      {icon} {label}
    </button>
  );
}

function TelemetryItem({ label, count, color }) {
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between",
      padding: "12px 0",
      borderBottom: "1px solid #f1f5f9"
    }}>
      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#64748b" }}>{label}</span>
      <span style={{
        background: color,
        color: "#ffffff",
        fontSize: "0.75rem",
        fontWeight: 800,
        padding: "3px 8px",
        borderRadius: "4px",
        lineHeight: 1
      }}>
        {count}
      </span>
    </div>
  );
}

function DropdownItem({ title, desc, time, isNew, type }) {
  let badgeColor = "#ef4444";
  let badgeBg = "rgba(239, 68, 68, 0.08)";
  if (type === "warning") {
    badgeColor = "#ca8a04";
    badgeBg = "#fef9c3";
  } else if (type === "success") {
    badgeColor = "#15803d";
    badgeBg = "#dcfce7";
  } else if (type === "info") {
    badgeColor = "#2563eb";
    badgeBg = "#dbeafe";
  }

  return (
    <div style={{
      padding: "12px 16px",
      borderBottom: "1px solid #f1f5f9",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      cursor: "pointer",
      background: isNew ? "rgba(239, 68, 68, 0.02)" : "transparent",
      transition: "background 0.2s"
    }}
    onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
    onMouseLeave={(e) => e.currentTarget.style.background = isNew ? "rgba(239, 68, 68, 0.02)" : "transparent"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>{title}</span>
        <span style={{ 
          fontSize: "0.65rem", 
          fontWeight: 800, 
          color: badgeColor, 
          background: badgeBg, 
          padding: "2px 6px", 
          borderRadius: "4px" 
        }}>{time}</span>
      </div>
      <span style={{ fontSize: "0.75rem", color: "#64748b", lineHeight: 1.4 }}>{desc}</span>
    </div>
  );
}

