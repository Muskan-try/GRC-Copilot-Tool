import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setToken, setCurrentUser, getToken, getCurrentUser } from "../api";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const err = searchParams.get("error");

    if (err) {
      setError("Authentication failed. Please try again.");
      return;
    }

    if (!token) {
      setError("No authentication token received.");
      return;
    }

    // Store the token
    setToken(token);

    // Fetch user profile to populate currentUser
    fetch("/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then((data) => {
        setCurrentUser({
          user_id: data.user_id,
          email: data.email,
          role: data.role,
          org_id: data.organization?.org_id || null,
        });
        navigate("/start", { replace: true });
      })
      .catch(() => {
        // Even without profile, we have the token — navigate to start
        navigate("/start", { replace: true });
      });
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="page">
        <div className="card card-narrow" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>{"\u274C"}</div>
          <h2 style={{ color: "var(--danger)", marginBottom: 12 }}>Authentication Failed</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card card-narrow" style={{ textAlign: "center" }}>
        <div className="loader" style={{ margin: "0 auto 20px" }}></div>
        <h2 style={{ color: "var(--text-main)", marginBottom: 12 }}>Signing you in...</h2>
        <p style={{ color: "var(--text-muted)" }}>Please wait while we complete the authentication.</p>
      </div>
    </div>
  );
}
