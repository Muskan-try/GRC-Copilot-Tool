import { createContext, useContext, useState, useCallback, useMemo } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "error") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: "14px 20px",
              borderRadius: 10,
              background: toast.type === "error" ? "var(--danger-bg)" : toast.type === "success" ? "var(--success-bg)" : "var(--primary-bg-subtle)",
              border: `1px solid ${toast.type === "error" ? "#fecaca" : toast.type === "success" ? "#bbf7d0" : "#bae6fd"}`,
              color: toast.type === "error" ? "var(--danger)" : toast.type === "success" ? "var(--success)" : "#075985",
              fontSize: "0.9rem",
              fontWeight: 600,
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              maxWidth: 360,
              display: "flex",
              alignItems: "center",
              gap: 10,
              animation: "slideIn 0.3s ease",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>
              {toast.type === "error" ? "⚠" : toast.type === "success" ? "✓" : "ℹ"}
            </span>
            {toast.message}
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1rem",
                color: "inherit",
                opacity: 0.6,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
