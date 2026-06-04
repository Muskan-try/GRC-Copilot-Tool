import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated } from "./api";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Auth from "./pages/Auth";
import Start from "./pages/Start";
import Assessment from "./pages/Assessment";
import Compliance from "./pages/Compliance";
import LevelOfAssessment from "./pages/LevelOfAssessment";
import ScopeDefinition from "./pages/ScopeDefinition";
import QuestionnaireEnhanced from "./pages/QuestionnaireEnhanced";
import DashboardV2 from "./pages/DashboardV2";
import ReportV2 from "./pages/ReportV2";
import ComplianceAgent from "./pages/ComplianceAgent";
import AuditLogs from "./pages/AuditLogs";
import ComplianceCalendar from "./pages/ComplianceCalendar";
import TeamManagement from "./pages/TeamManagement";
import OAuthCallback from "./pages/OAuthCallback";
import AdminDashboard from "./pages/AdminDashboard";
import OrgDashboard from "./pages/OrgDashboard";
import PolicyUploadWizard from "./pages/PolicyUploadWizard";
import { getCurrentUser } from "./api";

function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
}

function RequireRole({ children, roles }) {
  const authenticated = isAuthenticated();
  if (!authenticated) return <Navigate to="/" replace />;
  
  const user = getCurrentUser();
  const role = user?.role;
  
  if (!role) {
    // If authenticated but role not loaded yet, we might be in a sync gap
    return <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loader"></div></div>;
  }
  
  if (!roles.includes(role)) {
    console.warn(`Access denied for role ${role}. Required: ${roles}`);
    return <Navigate to="/start" replace />;
  }
  
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/start" element={<RequireAuth><Start /></RequireAuth>} />
              
              {/* Specialized Dashboards */}
              <Route path="/admin-dashboard" element={
                <RequireRole roles={['admin']}><AdminDashboard /></RequireRole>
              } />
              <Route path="/org-dashboard" element={
                <RequireRole roles={['org_admin', 'owner']}><OrgDashboard /></RequireRole>
              } />

              <Route path="/assessment" element={<RequireAuth><Assessment /></RequireAuth>} />
              <Route path="/scope" element={<RequireAuth><ScopeDefinition /></RequireAuth>} />
              <Route path="/compliance" element={<RequireAuth><Compliance /></RequireAuth>} />
              <Route path="/level-of-assessment" element={<RequireAuth><LevelOfAssessment /></RequireAuth>} />
              <Route path="/policy-upload/:id" element={<RequireAuth><PolicyUploadWizard /></RequireAuth>} />
              <Route path="/questionnaire-enhanced/:id" element={<RequireAuth><QuestionnaireEnhanced /></RequireAuth>} />
              
              <Route path="/dashboard-v2/:id" element={<RequireAuth><DashboardV2 /></RequireAuth>} />
              <Route path="/view-dashboard/:id" element={<RequireAuth><DashboardV2 /></RequireAuth>} />
              
              <Route path="/report-v2/:id" element={<RequireAuth><ReportV2 /></RequireAuth>} />
              <Route path="/agent" element={<RequireAuth><ComplianceAgent /></RequireAuth>} />
              <Route path="/audit-logs" element={<RequireAuth><AuditLogs /></RequireAuth>} />
              <Route path="/compliance-calendar" element={<RequireAuth><ComplianceCalendar /></RequireAuth>} />
              <Route path="/team-management" element={<RequireAuth><TeamManagement /></RequireAuth>} />
              <Route path="/team" element={<Navigate to="/team-management" replace />} />
              <Route path="/accept-invite" element={<RequireAuth><TeamManagement /></RequireAuth>} />
              <Route path="/oauth-callback" element={<OAuthCallback />} />
              
              {/* Legacy redirects */}
              <Route path="/dashboard" element={<Navigate to="/start" replace />} />
              <Route path="/dashboard/:id" element={<Navigate to="/dashboard-v2/:id" replace />} />
              <Route path="/report" element={<Navigate to="/start" replace />} />
              <Route path="/questions" element={<Navigate to="/start" replace />} />
              <Route path="/questionnaire-full" element={<Navigate to="/start" replace />} />
              <Route path="/audit-type" element={<Navigate to="/level-of-assessment" replace />} />
              <Route path="*" element={<Navigate to="/start" replace />} />
            </Routes>
          </Layout>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}
