import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login, register, isAuthenticated } from "../api";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", orgName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/start");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await register(form.email, form.password, form.orgName || form.email.split("@")[0]);
      } else {
        await login(form.email, form.password);
      }
      navigate("/start");
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ background: "var(--bg-color)" }}>
      <div className="card card-narrow" style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", border: "1px solid var(--cyber-border)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ 
            width: 48, height: 48, background: "var(--primary)", borderRadius: 12, 
            display: "inline-flex", alignItems: "center", justifyContent: "center", 
            marginBottom: 16, color: "var(--text-on-dark)", fontSize: "1.5rem", fontWeight: 800,
            boxShadow: "var(--glow)"
          }}>G</div>
          <h1 style={{ margin: 0, color: "var(--text-main)" }}>Compliance Hub</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>{mode === "login" ? "Secure access to your dashboard" : "Get started with your first assessment"}</p>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "var(--danger-bg)", border: "1px solid #fee2e2", borderRadius: 12, marginBottom: 20, fontSize: "0.88rem", color: "var(--danger)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1.1rem" }}>⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="field">
              <label>Organisation Name</label>
              <input
                style={{ background: "var(--surface)", color: "var(--text-main)", border: "1px solid var(--border-color)" }}
                type="text"
                placeholder="Enter organization name"
                value={form.orgName}
                onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                autoComplete="off"
              />
            </div>
          )}

          <div className="field">
            <label>Email</label>
            <input
              style={{ background: "var(--surface)", color: "var(--text-main)", border: "1px solid var(--border-color)" }}
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              style={{ background: "var(--surface)", color: "var(--text-main)", border: "1px solid var(--border-color)" }}
              type="password"
              placeholder="Min 8 chars, uppercase, lowercase, number"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: "center", fontSize: "0.88rem", color: "var(--text-muted)" }}>
          {mode === "login" ? (
            <>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode("register"); }} style={{ color: "var(--text-main)", fontWeight: 600 }}>Sign up</a></>
          ) : (
            <>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); }} style={{ color: "var(--text-main)", fontWeight: 600 }}>Sign in</a></>
          )}
        </div>
      </div>
    </div>
  );
}