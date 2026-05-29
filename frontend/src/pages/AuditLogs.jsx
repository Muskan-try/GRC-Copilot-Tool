import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAuditLogs, getCurrentUser } from "../api";
import { useToast } from "../components/Toast";

const ACTION_LABELS = {
  "user.login": "User Login",
  "user.register": "User Registration",
  "user.password_change": "Password Changed",
  "assessment.create": "Assessment Created",
  "assessment.update": "Assessment Updated",
  "assessment.complete": "Assessment Completed",
  "response.batch_submit": "Responses Submitted",
  "analysis.complete": "Analysis Completed",
  "analysis.failed": "Analysis Failed",
  "evidence.upload": "Evidence Uploaded",
  "evidence.delete": "Evidence Deleted",
  "compliance_agent.upload": "Policy Uploaded",
  "compliance_agent.run": "Compliance Agent Run",
  "compliance_agent.report": "Agent Report Viewed",
};

const ACTION_COLORS = {
  "user.login": "var(--info)",
  "user.register": "var(--success)",
  "user.password_change": "var(--warning)",
  "assessment.create": "var(--primary)",
  "assessment.update": "#6366f1",
  "assessment.complete": "var(--accent)",
  "response.batch_submit": "var(--primary)",
  "analysis.complete": "var(--success)",
  "analysis.failed": "var(--danger)",
  "evidence.upload": "#14b8a6",
  "evidence.delete": "#f43f5e",
  "compliance_agent.upload": "#a855f7",
  "compliance_agent.run": "#d946ef",
  "compliance_agent.report": "#ec4899",
};

function ActionBadge({ action }) {
  const color = ACTION_COLORS[action] || "var(--text-muted)";
  const label = ACTION_LABELS[action] || action;
  return (
    <span
      style={{
        fontSize: "0.7rem",
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 4,
        background: `${color}15`,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function ResourceBadge({ type, id }) {
  if (!type) return null;
  return (
    <span
      style={{
        fontSize: "0.7rem",
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 4,
        background: "var(--surface-hover)",
        color: "var(--text-muted)",
      }}
    >
      {type}
      {id && `: ${id.substring(0, 8)}...`}
    </span>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  const display = typeof value === "object" ? JSON.stringify(value) : String(value);
  return (
    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
      <span style={{ fontWeight: 700, color: "var(--text-main)" }}>{label}:</span> {display.length > 80 ? display.substring(0, 80) + "..." : display}
    </div>
  );
}

export default function AuditLogs() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = getCurrentUser();
  const isAdmin = user?.role === "admin";

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({
    action: "",
    resource_type: "",
    resource_id: "",
  });
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const f = {};
      if (filters.action) f.action = filters.action;
      if (filters.resource_type) f.resourceType = filters.resource_type;
      if (filters.resource_id) f.resourceId = filters.resource_id;
      const data = await getAuditLogs({
        ...f,
        limit,
        offset,
      });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.addToast("Failed to load audit logs: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [offset, filters, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div
      style={{
        padding: "40px 32px",
        background: "var(--surface-hover)",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-main)", margin: "0 0 4px 0" }}>
              Audit Trail
            </h1>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
              {total} total log entries{!isAdmin && " — showing your activity"}
            </p>
          </div>
          <button
            className="btn btn-back"
            style={{ fontSize: "0.85rem", padding: "8px 20px" }}
            onClick={() => navigate("/start")}
          >
            Back to Dashboard
          </button>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <select
            value={filters.action}
            onChange={(e) => {
              setOffset(0);
              setFilters((f) => ({ ...f, action: e.target.value }));
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "var(--surface)",
              fontSize: "0.85rem",
              color: "var(--text-main)",
              minWidth: 180,
            }}
          >
            <option value="">All Actions</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input
            placeholder="Resource type (e.g. assessment)"
            value={filters.resource_type}
            onChange={(e) => {
              setOffset(0);
              setFilters((f) => ({ ...f, resource_type: e.target.value }));
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: "0.85rem",
              color: "var(--text-main)",
              minWidth: 160,
            }}
          />
          <input
            placeholder="Resource ID"
            value={filters.resource_id}
            onChange={(e) => {
              setOffset(0);
              setFilters((f) => ({ ...f, resource_id: e.target.value }));
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: "0.85rem",
              color: "var(--text-main)",
              minWidth: 160,
            }}
          />
          {(filters.action || filters.resource_type || filters.resource_id) && (
            <button
              onClick={() => {
                setOffset(0);
                setFilters({ action: "", resource_type: "", resource_id: "" });
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "var(--surface)",
                fontSize: "0.8rem",
                color: "var(--danger)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Log List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div className="loader" style={{ margin: "0 auto 20px" }}></div>
            <p style={{ color: "var(--text-muted)" }}>Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div
            className="card"
            style={{ textAlign: "center", padding: 60, maxWidth: "none" }}
          >
            <h2 style={{ color: "var(--text-light)", fontSize: "1.2rem", marginBottom: 8 }}>
              No Audit Logs Found
            </h2>
            <p style={{ color: "var(--text-light)", fontSize: "0.9rem" }}>
              {isAdmin
                ? "No activity has been logged yet. Start using the application to see logs here."
                : "No activity found. Your actions will appear here as you use the platform."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {logs.map((log) => (
              <div
                key={log.id}
                className="card"
                style={{
                  padding: "16px 20px",
                  borderRadius: 10,
                  maxWidth: "none",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                {/* Timestamp column */}
                <div
                  style={{
                    flex: "0 0 140px",
                    fontSize: "0.75rem",
                    color: "var(--text-light)",
                    fontWeight: 600,
                    paddingTop: 2,
                  }}
                >
                  {new Date(log.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    <ActionBadge action={log.action} />
                    <ResourceBadge type={log.resource_type} id={log.resource_id} />
                    {log.ip_address && (
                      <span style={{ fontSize: "0.7rem", color: "var(--text-light)" }}>
                        {log.ip_address}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    by{" "}
                    <strong style={{ color: "var(--text-main)" }}>
                      {log.user_email || "Unknown"}
                    </strong>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      {Object.entries(log.details).map(([key, value]) => (
                        <DetailRow key={key} label={key} value={value} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
              marginTop: 24,
            }}
          >
            <button
              disabled={offset <= 0}
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              className="btn btn-back"
              style={{
                opacity: offset <= 0 ? 0.5 : 1,
                cursor: offset <= 0 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={offset + limit >= total}
              onClick={() => setOffset((o) => o + limit)}
              className="btn btn-primary"
              style={{
                width: "auto",
                margin: 0,
                opacity: offset + limit >= total ? 0.5 : 1,
                cursor: offset + limit >= total ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
