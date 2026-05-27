// API client for GRC Backend
// Uses VITE_API_URL env var in production (e.g., https://api.yourdomain.com)
// Defaults to /api for development proxy
const rawApiBase = import.meta.env.VITE_API_URL || "/api";
export const API_BASE = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;

let authToken = localStorage.getItem("grc_auth_token") || null;
let currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

export function setToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem("grc_auth_token", token);
  } else {
    localStorage.removeItem("grc_auth_token");
  }
}

export function getToken() {
  return authToken;
}

export function getCurrentUser() {
  return currentUser;
}

export function setCurrentUser(user) {
  currentUser = user;
  if (user) {
    localStorage.setItem("currentUser", JSON.stringify(user));
  } else {
    localStorage.removeItem("currentUser");
  }
}

function headers(extra = {}) {
  const h = { "Content-Type": "application/json", ...extra };
  if (authToken) h["Authorization"] = `Bearer ${authToken}`;
  return h;
}

async function request(path, options = {}) {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${API_BASE}${path}${separator}_t=${Date.now()}`;
  const res = await fetch(url, {
    ...options,
    headers: headers(options.headers),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || `API error: ${res.status}`);
    error.status = res.status;
    error.data = data;
    if (res.status === 401) {
      logout();
      // Only redirect if we are not already on the auth page to avoid loops
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    throw error;
  }

  return data;
}

// ─── Auth ───────────────────────────────────────────────────────
export async function register(email, password, orgName) {
  const data = await request("/auth/register", {
    method: "POST",
    body: { email, password, org_name: orgName }, 
  });
  setToken(data.token);
  setCurrentUser({ user_id: data.user_id, email: data.email, role: data.role, org_id: data.org_id });
  sessionStorage.clear(); 
  return data;
}

export async function login(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  setToken(data.token);
  setCurrentUser({ user_id: data.user_id, email: data.email, role: data.role, org_id: data.org_id });
  sessionStorage.clear(); // Clear any stale progress from other users
  return data;
}

export async function getProfile() {
  return request("/auth/profile");
}

export function logout() {
  setToken(null);
  setCurrentUser(null);
  sessionStorage.clear();
}

export function isAuthenticated() {
  return !!authToken;
}

// ─── Organization ───────────────────────────────────────────────
export async function setupOrganization(orgData) {
  return request("/organization/setup", {
    method: "POST",
    body: orgData,
  });
}

export async function getOrganization(id) {
  return request(`/organization/${id}`);
}

export async function listOrganizations() {
  return request("/organization");
}

// ─── Questionnaire ──────────────────────────────────────────────
export async function getQuestionnaire(assessmentId) {
  return request(`/questionnaire/generate?assessment_id=${assessmentId}`);
}

export async function getFrameworks() {
  return request("/questionnaire/frameworks");
}

// ─── Responses ──────────────────────────────────────────────────
export async function submitResponses({ assessment_id, responses, is_final = true, risk_priorities = {} }) {
  return request("/responses/submit", {
    method: "POST",
    body: { assessment_id, responses, is_final, risk_priorities },
  });
}

export async function getResponses(assessmentId) {
  return request(`/responses/${assessmentId}`);
}

// ─── Dashboard ──────────────────────────────────────────────────
export async function getDashboard(assessmentId) {
  return request(`/dashboard/${assessmentId}`);
}

export async function listDashboards() {
  return request("/dashboard");
}

// ─── Reports ────────────────────────────────────────────────────
export async function getReport(reportId) {
  return request(`/reports/${reportId}`);
}

export async function getReportByAssessment(assessmentId) {
  return request(`/reports/assessment/${assessmentId}`);
}

export async function getReportSection(reportId, section) {
  return request(`/reports/${reportId}/sections/${section}`);
}

export async function getAssessmentCost(assessmentId, currency = 'USD') {
  return request(`/reports/assessment/${assessmentId}/cost?currency=${currency}`);
}

// ─── V2 MODULAR API (NEW) ────────────────────────────────────────

export async function createAssessmentV2({ organization_name, selected_frameworks, scope, analysis_depth = 'quick', assessment_type = 'compliance_assessment' }) {
  return request("/v2/assessment/create", {
    method: "POST",
    body: { organization_name, selected_frameworks, scope, analysis_depth, assessment_type },
  });
}

export async function getAssessmentV2(assessmentId) {
  return request(`/v2/assessment/${assessmentId}`);
}

export async function completeAssessmentV2(assessmentId) {
  return request(`/v2/assessment/${assessmentId}/complete`, {
    method: "POST",
  });
}

export async function addAssessmentFrameworks(assessmentId, frameworks) {
  return request(`/v2/assessment/${assessmentId}/frameworks`, {
    method: "POST",
    body: { frameworks },
  });
}

export async function updateAssessmentConfig(assessmentId, { analysis_depth, assessment_type, status }) {
  return request(`/v2/assessment/${assessmentId}/config`, {
    method: "PATCH",
    body: { analysis_depth, assessment_type, status },
  });
}

export async function getDashboardV2(assessmentId) {
  return request(`/v2/assessment/${assessmentId}/dashboard`);
}

export async function getGapsV2(assessmentId) {
  return request(`/v2/assessment/${assessmentId}/gaps`);
}

export async function getInsuranceScoreV2(assessmentId) {
  return request(`/v2/assessment/${assessmentId}/insurance-score`);
}

export async function getQuestionsV2(assessmentId) {
  return request(`/v2/questionnaire/assessment/${assessmentId}/questions`);
}

export async function getQuestionsByFramework(frameworkName) {
  return request(`/v2/questionnaire/framework/${encodeURIComponent(frameworkName)}/questions`);
}

export async function submitResponseV2(assessmentId, questionId, responseData) {
  return request(`/v2/questionnaire/assessment/${assessmentId}/response`, {
    method: "POST",
    body: { question_id: questionId, ...responseData },
  });
}

export async function getRisksV2(assessmentId) {
  return request(`/v2/risk/assessment/${assessmentId}`);
}

export async function updateRiskStatusV2(riskId, status, mitigation_plan) {
  return request(`/v2/risk/${riskId}/status`, {
    method: "PATCH",
    body: { status, mitigation_plan },
  });
}

export async function uploadEvidenceV2(assessmentId, questionId, files) {
  const formData = new FormData();
  if (questionId) formData.append("question_id", questionId);
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
  }

  const url = `${API_BASE}/v2/assessment/${assessmentId}/evidence`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${authToken}` }, // No Content-Type for multipart
    body: formData,
  });

  return res.json();
}

export async function getReportV2(assessmentId) {
  return request(`/v2/reporting/assessment/${assessmentId}?format=json`);
}

// ─── AI Assistant ──────────────────────────────────────────────────
export async function chatWithAI(message, history, context) {
  return request("/ai/chat", {
    method: "POST",
    body: { message, history, context },
  });
}

// ─── Compliance Mapping Agent ──────────────────────────────────────
export async function uploadPolicy(file) {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${API_BASE}/agent/compliance/upload-policy`;
  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${authToken}`,
      "X-Internal-Service": "grc-gateway" // Add this if needed by backend middleware
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed: ${res.status}`);
  return data;
}

export async function runComplianceAgent(file, framework = 'all') {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target_framework", framework);

  const url = `${API_BASE}/agent/compliance/run`;
  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${authToken}`,
      "X-Internal-Service": "grc-gateway"
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Agent run failed: ${res.status}`);
  return data;
}

export async function getComplianceReport(reportId) {
  return request(`/agent/compliance/report/${reportId}`);
}

export async function autoAnswerPolicy(file, assessmentId, orgWebsite) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("assessment_id", assessmentId);
  if (orgWebsite) formData.append("org_website", orgWebsite);

  const url = `${API_BASE}/agent/compliance/auto-answer`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${authToken}` },
    body: formData,
  });

  return res.json();
}

// ─── Audit Log API ────────────────────────────────────────────────────────

export async function getAuditLogs({ userId, action, resourceType, resourceId, limit = 100, offset = 0, from, to } = {}) {
  const params = new URLSearchParams();
  if (userId) params.set('user_id', userId);
  if (action) params.set('action', action);
  if (resourceType) params.set('resource_type', resourceType);
  if (resourceId) params.set('resource_id', resourceId);
  if (limit) params.set('limit', limit);
  if (offset) params.set('offset', offset);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return request(`/audit/logs${qs ? `?${qs}` : ''}`);
}

export async function getAuditStats() {
  return request('/audit/stats');
}

// ─── Compliance Calendar API ──────────────────────────────────────────────

export async function getCalendarEvents(params = {}) {
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  if (params.status) qs.set('status', params.status);
  if (params.year) qs.set('year', params.year);
  if (params.month) qs.set('month', params.month);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const s = qs.toString();
  return request(`/calendar/events${s ? `?${s}` : ''}`);
}

export async function createCalendarEvent(data) {
  return request('/calendar/events', { method: 'POST', body: data });
}

export async function updateCalendarEvent(id, data) {
  return request(`/calendar/events/${id}`, { method: 'PUT', body: data });
}

export async function deleteCalendarEvent(id) {
  return request(`/calendar/events/${id}`, { method: 'DELETE' });
}