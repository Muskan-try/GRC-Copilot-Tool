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

function RequireAuth({ children }) {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
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
              <Route path="/assessment" element={<RequireAuth><Assessment /></RequireAuth>} />
              <Route path="/scope" element={<RequireAuth><ScopeDefinition /></RequireAuth>} />
              <Route path="/compliance" element={<RequireAuth><Compliance /></RequireAuth>} />
              <Route path="/level-of-assessment" element={<RequireAuth><LevelOfAssessment /></RequireAuth>} />
              <Route path="/questionnaire-enhanced/:id" element={<RequireAuth><QuestionnaireEnhanced /></RequireAuth>} />
              <Route path="/dashboard-v2/:id" element={<RequireAuth><DashboardV2 /></RequireAuth>} />
              <Route path="/report-v2/:id" element={<RequireAuth><ReportV2 /></RequireAuth>} />
              <Route path="/agent" element={<RequireAuth><ComplianceAgent /></RequireAuth>} />
              {/* Legacy redirects */}
              <Route path="/dashboard" element={<Navigate to="/start" replace />} />
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
