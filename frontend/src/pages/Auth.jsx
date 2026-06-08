import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login, register, isAuthenticated, getCurrentUser } from "../api";
import { 
  Mail, 
  Lock, 
  Building2, 
  ArrowRight, 
  ShieldCheck, 
  ChevronRight, 
  Globe, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCog,
  ShieldAlert,
  Users,
  Briefcase,
  ArrowLeft,
  Eye,
  EyeOff
} from "lucide-react";

const ROLES = [
  {
    id: "admin",
    title: "Super Admin",
    description: "Full system control, global configuration, and multi-org management.",
    icon: <ShieldAlert size={28} />
  },
  {
    id: "org_admin",
    title: "Organization Admin",
    description: "Manage organization settings, team members, and overall compliance posture.",
    icon: <UserCog size={28} />
  },
  {
    id: "lead",
    title: "Team Lead (Checker)",
    description: "Lead specific assessments, assign tasks, and review team responses.",
    icon: <Briefcase size={28} />
  },
  {
    id: "member",
    title: "Team Member (Maker)",
    description: "Execute assigned controls, provide evidence, and participate in audits.",
    icon: <Users size={28} />
  }
];

export default function Auth() {
  const navigate = useNavigate();
  const [step, setStep] = useState("role"); // 'role' or 'form'
  const [mode, setMode] = useState("login");
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({ email: "", password: "", orgName: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const performRedirection = (user) => {
    if (!user) {
      navigate("/start");
      return;
    }
    
    const role = user.role;
    console.log("Redirecting user with role:", role);
    
    if (role === 'admin') {
      navigate('/admin-dashboard');
    } else if (role === 'org_admin' || role === 'owner') {
      navigate('/org-dashboard');
    } else if (role === 'lead') {
      // For team leads (checkers), they see a read-only validation portal
      navigate('/start'); 
    } else {
      // Default fallback for team member (maker) or others
      navigate('/start');
    }
  };

  useEffect(() => {
    if (isAuthenticated()) {
      const user = getCurrentUser();
      if (user) {
        performRedirection(user);
      }
    }
  }, [navigate]);

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setStep("form");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let res;
      if (mode === "register") {
        res = await register(
          form.email, 
          form.password, 
          selectedRole === 'admin' ? 'Super Admin Organization' : (form.orgName || form.email.split("@")[0]),
          selectedRole
        );
      } else {
        res = await login(form.email, form.password);
      }
      
      // Explicitly update token and currentUser in localStorage synchronously before navigating
      const token = res.token;
      const userRole = res.role || res.user?.role;
      const userId = res.user_id || res.user?.id;
      const orgId = res.org_id || res.user?.org_id;
      const email = res.email || form.email;

      if (token) {
        localStorage.setItem("grc_auth_token", token);
      }
      localStorage.setItem("currentUser", JSON.stringify({
        user_id: userId,
        email: email,
        role: userRole,
        org_id: orgId
      }));

      console.log("Login successful. Role:", userRole);
      
      // Explicit conditional block to route roles
      if (userRole === 'admin') {
        navigate('/admin-dashboard');
      } else if (userRole === 'org_admin' || userRole === 'owner') {
        navigate('/org-dashboard');
      } else {
        // Fallback for team_lead, team_member, or any others to /start
        navigate('/start');
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

  const goBackToRole = () => {
    setStep("role");
    setError("");
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      background: "var(--bg-color)",
      color: "var(--text-main)",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Left Panel: Visual & Branding (Hidden on small screens) */}
      <div style={{ 
        width: "60%", 
        display: "flex", 
        flexDirection: "column",
        background: "url('/auth_panel_bg.png') no-repeat center center / cover",
        padding: "60px",
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        justifyContent: "center"
      }} className="auth-visual-panel">
        
        {/* Dark Purple/Blue Overlay for readability */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(135deg, rgba(88, 28, 135, 0.85), rgba(30, 27, 75, 0.9))",
          zIndex: 0
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "550px" }}>
          <h1 style={{ 
            fontSize: "3.5rem", 
            lineHeight: 1.1, 
            fontWeight: 800, 
            marginBottom: "24px",
            background: "linear-gradient(to bottom right, #fff, #cbd5e1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Simplify Governance. <br/>
            Automate Risk.
          </h1>
          
          <p style={{ 
            fontSize: "1.25rem", 
            color: "#cbd5e1", 
            marginBottom: "48px",
            lineHeight: 1.6 
          }}>
            The all-in-one AI platform for modern compliance teams to manage security frameworks and audits with ease.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <BenefitItem icon={<CheckCircle2 size={20} color="var(--primary)" />} text="Automated compliance gap analysis" />
            <BenefitItem icon={<CheckCircle2 size={20} color="var(--primary)" />} text="Real-time risk monitoring & reporting" />
            <BenefitItem icon={<CheckCircle2 size={20} color="var(--primary)" />} text="Intelligent audit trail management" />
          </div>
        </div>

        <div style={{ 
          position: "absolute", 
          bottom: "40px", 
          left: "60px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.875rem",
          color: "#94a3b8",
          zIndex: 1
        }}>
          <Globe size={16} />
          <span>Trusted by 500+ security organizations worldwide</span>
        </div>
      </div>

      {/* Right Panel: Auth Content */}
      <div style={{ 
        width: "40%", 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center",
        padding: "60px 80px",
        background: "var(--surface)",
        borderLeft: "1px solid var(--border-color)",
        boxSizing: "border-box"
      }} className="auth-form-panel">
        <div style={{ width: "100%", maxWidth: "480px", margin: "0 auto" }}>
          {step === "role" ? (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              <div style={{ marginBottom: "32px", textAlign: "center" }}>
                <h2 style={{ fontSize: "2.4rem", fontWeight: 800, marginBottom: "8px", color: "#7e22ce", letterSpacing: "-0.02em" }}>
                  Select Your Role
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
                  Choose the path that best describes your responsibilities.
                </p>
              </div>

              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "1fr 1fr", 
                gap: "16px",
                marginBottom: "24px"
              }}>
                {ROLES.map((role) => (
                  <button 
                    key={role.id}
                    onClick={() => handleRoleSelect(role.id)}
                    style={{
                      background: "var(--bg-color)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "16px",
                      padding: "24px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "12px"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#7e22ce";
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-color)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ 
                      width: "40px", 
                      height: "40px", 
                      borderRadius: "10px", 
                      background: "rgba(126, 34, 206, 0.1)", 
                      color: "#7e22ce",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {role.icon}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <h4 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "2px", color: "var(--text-main)" }}>
                        {role.title}
                      </h4>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                        {role.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ textAlign: "center", fontSize: "0.95rem", color: "var(--text-muted)" }}>
                Already have an account? <button onClick={() => setStep("form")} style={{ background: "none", border: "none", padding: 0, color: "#7e22ce", fontWeight: 700, cursor: "pointer", fontSize: "inherit" }}>Sign in directly</button>
              </div>
            </div>
          ) : (
            <div style={{ animation: "slideInRight 0.4s ease" }}>
              <button 
                onClick={goBackToRole}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px", 
                  background: "none", 
                  border: "none", 
                  padding: 0, 
                  color: "var(--text-muted)", 
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  marginBottom: "24px"
                }}
              >
                <ArrowLeft size={16} /> Back to role selection
              </button>

              <div style={{ marginBottom: "32px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ padding: "6px", background: "rgba(126, 34, 206, 0.1)", color: "#7e22ce", borderRadius: "6px" }}>
                    {ROLES.find(r => r.id === selectedRole)?.icon || <ShieldCheck size={20} />}
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#7e22ce" }}>
                    {ROLES.find(r => r.id === selectedRole)?.title || "Authentication"}
                  </span>
                </div>
                <h2 style={{ fontSize: "2.4rem", fontWeight: 800, marginBottom: "8px", color: "#7e22ce", letterSpacing: "-0.02em" }}>
                  {mode === "login" ? "Sign In" : "Get started"}
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
                  {mode === "login" 
                    ? "Enter your credentials to access your dashboard" 
                    : `Create your ${ROLES.find(r => r.id === selectedRole)?.title} account`}
                </p>
              </div>

              {error && (
                <div style={{ 
                  padding: "14px 16px", 
                  background: "rgba(239, 68, 68, 0.1)", 
                  border: "1px solid rgba(239, 68, 68, 0.2)", 
                  borderRadius: "12px", 
                  marginBottom: "20px", 
                  color: "var(--danger)",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "0.9rem"
                }}>
                  <AlertCircle size={20} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {mode === "register" && selectedRole !== 'admin' && (
                  <div className="field">
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", color: "#4b5563", fontWeight: 600, marginBottom: "6px" }}>
                      <Building2 size={14} /> 
                      {selectedRole === 'lead' || selectedRole === 'member' 
                        ? "Enter Your Organization" 
                        : "Organization Name"}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        style={{ 
                          width: "100%",
                          paddingLeft: "42px",
                          background: "#ffffff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "10px",
                          height: "48px",
                          color: "#1e293b",
                          fontSize: "0.95rem"
                        }}
                        type="text"
                        placeholder={selectedRole === 'lead' || selectedRole === 'member' 
                          ? "e.g. Acme Corporation" 
                          : "Enter organization name"}
                        value={form.orgName}
                        onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                        required
                        autoComplete="off"
                      />
                      <Building2 size={18} style={{ position: "absolute", left: "14px", top: "15px", color: "var(--text-light)" }} />
                    </div>
                  </div>
                )}

                <div className="field">
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", color: "#4b5563", fontWeight: 600, marginBottom: "6px" }}>
                    <Mail size={14} /> Work Email
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      style={{ 
                        width: "100%",
                        paddingLeft: "42px",
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        height: "48px",
                        color: "#1e293b",
                        fontSize: "0.95rem"
                      }}
                      type="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      autoComplete="off"
                    />
                    <Mail size={18} style={{ position: "absolute", left: "14px", top: "15px", color: "var(--text-light)" }} />
                  </div>
                </div>

                <div className="field">
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", color: "#4b5563", fontWeight: 600, marginBottom: "6px" }}>
                    <Lock size={14} /> Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      style={{ 
                        width: "100%",
                        paddingLeft: "42px",
                        paddingRight: "42px",
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "10px",
                        height: "48px",
                        color: "#1e293b",
                        fontSize: "0.95rem"
                      }}
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <Lock size={18} style={{ position: "absolute", left: "14px", top: "15px", color: "var(--text-light)" }} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "14px",
                        top: "12px",
                        background: "none",
                        border: "none",
                        color: "var(--text-light)",
                        cursor: "pointer",
                        padding: "4px"
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {mode === "login" && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem", marginTop: "4px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6b7280", cursor: "pointer", margin: 0 }}>
                      <input type="checkbox" style={{ accentColor: "#7e22ce" }} /> Remember me
                    </label>
                    <a href="#" style={{ color: "#7e22ce", textDecoration: "none", fontWeight: 600 }}>Forgot password?</a>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: mode === "login" ? "flex-end" : "center", marginTop: "8px" }}>
                  <button 
                    type="submit" 
                    disabled={loading}
                    style={{ 
                      height: "46px", 
                      background: "#7e22ce",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "10px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex", 
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      padding: "0 40px",
                      boxShadow: "0 4px 12px rgba(126, 34, 206, 0.2)",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#6b21a8"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#7e22ce"; }}
                  >
                    {loading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        {mode === "login" ? "LOGIN" : "REGISTER"}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div style={{ 
                marginTop: "32px", 
                textAlign: "center", 
                fontSize: "0.9rem", 
                color: "var(--text-muted)" 
              }}>
                {mode === "login" ? (
                  <>Don't have an account? <button onClick={toggleMode} style={{ background: "none", border: "none", padding: 0, color: "#7e22ce", fontWeight: 700, cursor: "pointer", fontSize: "inherit" }}>Signup</button></>
                ) : (
                  <>Already have an account? <button onClick={toggleMode} style={{ background: "none", border: "none", padding: 0, color: "#7e22ce", fontWeight: 700, cursor: "pointer", fontSize: "inherit" }}>Sign in</button></>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .auth-visual-panel {
            display: none !important;
          }
          .auth-form-panel {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function BenefitItem({ icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{ 
        width: "32px", 
        height: "32px", 
        borderRadius: "50%", 
        background: "rgba(14, 165, 233, 0.1)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        {icon}
      </div>
      <span style={{ fontSize: "1rem", fontWeight: 500, color: "#cbd5e1" }}>{text}</span>
    </div>
  );
}

function SocialButton({ icon, label }) {
  return (
    <button style={{ 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      gap: "10px", 
      height: "48px",
      background: "var(--surface)",
      border: "1px solid var(--border-color)",
      borderRadius: "10px",
      cursor: "pointer",
      fontSize: "0.875rem",
      fontWeight: 600,
      color: "var(--text-main)",
      transition: "all 0.2s ease"
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-color)"; e.currentTarget.style.borderColor = "var(--primary)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--border-color)"; }}
    >
      {icon}
      {label}
    </button>
  );
}