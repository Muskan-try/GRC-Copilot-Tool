import { useLocation } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-color)" }}>
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch", width: "100%", maxWidth: "100%" }}>
        {children}
      </main>
    </div>
  );
}
