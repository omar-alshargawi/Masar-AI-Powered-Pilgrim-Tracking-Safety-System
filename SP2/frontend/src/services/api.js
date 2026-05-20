import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "";

// ── Existing admin (global) endpoints ─────────────────────────────────────────
export const api = {
  getPilgrims: () => axios.get(`${BASE}/api/pilgrims`).then((r) => r.data),
  getAlerts:   (limit = 50) => axios.get(`${BASE}/api/alerts?limit=${limit}`).then((r) => r.data),
  getStats:    () => axios.get(`${BASE}/api/stats`).then((r) => r.data),
};

// ── Admin management ───────────────────────────────────────────────────────────
export const adminApi = {
  getCampaigns:       () => axios.get(`${BASE}/api/admin/campaigns`).then((r) => r.data),
  createCampaign:     (data) => axios.post(`${BASE}/api/admin/campaigns`, data).then((r) => r.data),
  deactivateCampaign: (id) => axios.patch(`${BASE}/api/admin/campaigns/${id}/deactivate`).then((r) => r.data),
  deleteCampaign:     (id) => axios.delete(`${BASE}/api/admin/campaigns/${id}`),

  getUsers:    () => axios.get(`${BASE}/api/admin/users`).then((r) => r.data),
  createUser:  (data) => axios.post(`${BASE}/api/admin/users`, data).then((r) => r.data),
  deleteUser:  (id) => axios.delete(`${BASE}/api/admin/users/${id}`),

  getAssignments:   (campaignId) => axios.get(`${BASE}/api/admin/campaigns/${campaignId}/assignments`).then((r) => r.data),
  createAssignment: (campaignId, data) => axios.post(`${BASE}/api/admin/campaigns/${campaignId}/assignments`, data).then((r) => r.data),
  deleteAssignment: (id) => axios.delete(`${BASE}/api/admin/assignments/${id}`),

  getCampaignStats: (campaignId) => axios.get(`${BASE}/api/admin/campaigns/${campaignId}/stats`).then((r) => r.data),
  getGlobalStats:   () => axios.get(`${BASE}/api/admin/stats`).then((r) => r.data),
};

// ── Supervisor ────────────────────────────────────────────────────────────────
export const supervisorApi = {
  getPilgrims:            (supId) => axios.get(`${BASE}/api/supervisor/${supId}/pilgrims`).then((r) => r.data),
  getAlerts:              (supId) => axios.get(`${BASE}/api/supervisor/${supId}/alerts`).then((r) => r.data),
  getHelpRequests:        (supId) => axios.get(`${BASE}/api/supervisor/${supId}/help-requests`).then((r) => r.data),
  acknowledgeHelpRequest: (supId, reqId) =>
    axios.patch(`${BASE}/api/supervisor/${supId}/help-requests/${reqId}/acknowledge`).then((r) => r.data),
  shareLocation: (supId, data) => axios.post(`${BASE}/api/supervisor/${supId}/location`, data).then((r) => r.data),
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:    (data) => axios.post(`${BASE}/api/auth/login`,    data).then((r) => r.data),
  register: (data) => axios.post(`${BASE}/api/auth/register`, data).then((r) => r.data),
};

// ── Pilgrim ───────────────────────────────────────────────────────────────────
export const pilgrimApi = {
  getStatus:       (pilId) => axios.get(`${BASE}/api/pilgrim/${pilId}/status`).then((r) => r.data),
  sendHelpRequest: (pilId, message) => axios.post(`${BASE}/api/pilgrim/${pilId}/help`, { message }).then((r) => r.data),
  postLocation:    (data) => axios.post(`${BASE}/api/location`, data).then((r) => r.data),
};
