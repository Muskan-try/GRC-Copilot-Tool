import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page" style={{ background: "var(--bg-color)", textAlign: "center" }}>
          <div className="card" style={{ maxWidth: 500 }}>
            <h1 style={{ color: "var(--danger)", marginBottom: 16 }}>Something went wrong</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
