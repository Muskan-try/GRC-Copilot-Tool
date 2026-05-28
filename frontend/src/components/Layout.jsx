import { useNavigate, useLocation } from "react-router-dom";
import { logout, getCurrentUser, isAuthenticated } from "../api";
import { useTheme } from "../contexts/ThemeContext";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const authenticated = isAuthenticated();
  const { theme, toggleTheme } = useTheme();

  const fullscreenPaths = ["/", "/questionnaire-enhanced", "/report-v2", "/dashboard-v2"];
  const isFullscreen = fullscreenPaths.some((p) => location.pathname.startsWith(p));

  if (!authenticated || isFullscreen) {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-color)" }}>
      <header
        style={{
          height: 64,
          background: "var(--nav-bg)",
          borderBottom: "1px solid var(--cyber-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => navigate("/start")}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "var(--primary)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-on-dark)",
              fontSize: "1.1rem",
              fontWeight: 800,
            }}
          >
            G
          </div>
          <span style={{ color: "var(--text-on-dark)", fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
            GRC Copilot
          </span>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavButton label="Dashboard" path="/start" current={location.pathname} navigate={navigate} />
          <NavButton label="Assessments" path="/start" current={location.pathname} navigate={navigate} />
          <NavButton label="AI Agent" path="/agent" current={location.pathname} navigate={navigate} />
          <NavButton label="Audit Trail" path="/audit-logs" current={location.pathname} navigate={navigate} />
          <NavButton label="Calendar" path="/compliance-calendar" current={location.pathname} navigate={navigate} />
          <NavButton label="Team" path="/team" current={location.pathname} navigate={navigate} />
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              userSelect: "none",
              padding: "4px 0",
            }}
          >
            <span style={{ fontSize: "0.8rem", color: theme === "dark" ? "var(--text-light)" : "var(--warning)", transition: "color 0.2s" }}>
              {"\u2600\uFE0F"}
            </span>
            <div
              style={{
                width: 32,
                height: 18,
                borderRadius: 9,
                background: theme === "dark" ? "var(--primary)" : "#cbd5e1",
                position: "relative",
                transition: "background 0.2s",
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "var(--surface)",
                  position: "absolute",
                  top: 2,
                  left: theme === "dark" ? 16 : 2,
                  transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </div>
            <span style={{ fontSize: "0.8rem", color: theme === "dark" ? "var(--warning)" : "var(--text-light)", transition: "color 0.2s" }}>
              {"\u{1F319}"}
            </span>
          </div>
          <span style={{ color: "var(--text-light)", fontSize: "0.85rem" }}>
            {user?.email}
          </span>
          <button
            onClick={() => { if (window.confirm("Are you sure you want to log out?")) { logout(); navigate("/"); } }}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid var(--border-light)",
              background: "transparent",
              color: "var(--text-light)",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.color = "var(--text-light)"; }}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch", width: "100%", maxWidth: "100%" }}>{children}</main>
    </div>
  );
}

function NavButton({ label, path, current, navigate }) {
  const active = current === path || current.startsWith(path + "/");
  return (
    <button
      onClick={() => navigate(path)}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "none",
        background: active ? "var(--primary-bg-subtle)" : "transparent",
        color: active ? "var(--primary)" : "var(--text-light)",
        fontSize: "0.85rem",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </button>
  );
}
