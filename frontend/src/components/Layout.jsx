import { useNavigate, useLocation } from "react-router-dom";
import { logout, getCurrentUser, isAuthenticated } from "../api";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const authenticated = isAuthenticated();

  // Pages that should not show the top nav (full-screen experiences)
  const fullscreenPaths = ["/", "/questionnaire-enhanced", "/report-v2", "/dashboard-v2"];
  const isFullscreen = fullscreenPaths.some((p) => location.pathname.startsWith(p));

  if (!authenticated || isFullscreen) {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-color)" }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          height: 64,
          background: "rgba(15, 23, 42, 0.95)",
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
              color: "#fff",
              fontSize: "1.1rem",
              fontWeight: 800,
            }}
          >
            G
          </div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
            GRC Copilot
          </span>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavButton label="Dashboard" path="/start" current={location.pathname} navigate={navigate} />
          <NavButton label="Assessments" path="/start" current={location.pathname} navigate={navigate} />
          <NavButton label="AI Agent" path="/agent" current={location.pathname} navigate={navigate} />
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "var(--text-light)", fontSize: "0.85rem" }}>
            {user?.email}
          </span>
          <button
            onClick={() => { logout(); navigate("/"); }}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "var(--text-light)",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "var(--text-light)"; }}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={{ flex: 1 }}>{children}</main>
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
        background: active ? "rgba(14, 165, 233, 0.15)" : "transparent",
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
