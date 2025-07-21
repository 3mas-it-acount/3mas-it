import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Don't show toast here as we handle errors in components
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
};

// Users API
export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }).then(res => res.data),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  changePassword: (id, passwordData) => api.put(`/users/${id}/password`, passwordData),
  changeUserPassword: (id, newPassword, currentPassword) => api.put(`/users/${id}/admin-password`, { newPassword, currentPassword }),
  activateUser: (id) => api.put(`/users/${id}/activate`),
  deactivateUser: (id) => api.put(`/users/${id}/deactivate`),
  getUserEmailConfig: (id) => api.get(`/users/${id}/email-config`).then(res => res.data),
  updateUserEmailConfig: (id, data) => api.post(`/users/${id}/email-config`, data),
  deleteUserEmailConfig: (id) => api.delete(`/users/${id}/email-config`),
  getUsersForSharing: () => api.get('/users/for-sharing').then(res => res.data.users),
};

// Tickets API
export const ticketsAPI = {
  getTickets: (params) => api.get('/tickets', { params }).then(res => res.data),
  getTicket: (id) => api.get(`/tickets/${id}`).then(res => res.data),
  createTicket: (formData) => api.post('/tickets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateTicket: (id, ticketData) => api.put(`/tickets/${id}`, ticketData),
  deleteTicket: (id) => api.delete(`/tickets/${id}`),
  assignTicket: (id, assigneeId) => api.put(`/tickets/${id}/assign`, { assignedTo: assigneeId }),
  getTicketComments: (id) => api.get(`/tickets/${id}/comments`).then(res => res.data),
  addTicketComment: (id, data) => api.post(`/tickets/${id}/comments`, data),
  addComment: (id, formData) => api.post(`/tickets/${id}/comments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAllTicketAttachments: (id) => api.get(`/tickets/${id}/all-attachments`).then(res => res.data),
  getTicketReport: (id) => api.get(`/tickets/${id}/report`).then(res => res.data),
  updateTicketReport: (id, report) => api.put(`/tickets/${id}/report`, { report }).then(res => res.data),
};

// Employees API
export const employeesAPI = {
  getEmployees: (params) => api.get('/employees', { params }),
  getEmployee: (id) => api.get(`/employees/${id}`),
  createEmployee: (employeeData) => api.post('/employees', employeeData),
  updateEmployee: (id, employeeData) => api.put(`/employees/${id}`, employeeData),
  deleteEmployee: (id) => api.delete(`/employees/${id}`),
  getDepartments: () => api.get('/employees/departments/list'),
  getPositions: () => api.get('/employees/positions/list'),
};

// Email API
export const emailAPI = {
  getEmailConfigs: () => api.get('/email'),
  getEmailConfig: (id) => api.get(`/email/${id}`),
  createEmailConfig: (configData) => api.post('/email', configData),
  updateEmailConfig: (id, configData) => api.put(`/email/${id}`, configData),
  deleteEmailConfig: (id) => api.delete(`/email/${id}`),
  testEmailConfig: (id) => api.post(`/email/${id}/test`),
  getEmails: (id, params) => api.get(`/email/${id}/emails`, { params }),
  sendEmail: (id, emailData) => api.post(`/email/${id}/send`, emailData),
  deleteEmail: (accountId, folder, seqno) =>
    api.delete(`/email/${accountId}/emails/${seqno}?folder=${encodeURIComponent(folder)}`),
  markEmailRead: (accountId, seqno, read, folder) =>
    api.patch(`/email/${accountId}/emails/${seqno}/read${folder ? `?folder=${encodeURIComponent(folder)}` : ''}`, { read }),
  moveEmail: (accountId, seqno, targetFolder, folder) =>
    api.post(`/email/${accountId}/emails/${seqno}/move${folder ? `?folder=${encodeURIComponent(folder)}` : ''}`, { targetFolder }),
  getFolders: (accountId) => api.get(`/email/${accountId}/folders`).then(res => res.data),
};

// Custom Data API
export const customDataAPI = {
  getCustomTables: () => api.get('/custom-data'),
  getCustomTable: (id) => api.get(`/custom-data/${id}`),
  createCustomTable: (tableData) => api.post('/custom-data', tableData),
  updateCustomTable: (id, tableData) => api.put(`/custom-data/${id}`, tableData),
  deleteCustomTable: (id) => api.delete(`/custom-data/${id}`),
};

// Fetch full content of a specific email
export async function fetchEmailContent(accountId, folder, seqno) {
  return api.get(`/email/${accountId}/emails/${seqno}?folder=${encodeURIComponent(folder)}`)
    .then(res => res.data);
}

// Permissions API
export const permissionsAPI = {
  createPermissionRequest: (data) => {
    const formData = new FormData();
    if (data.pageName) formData.append('pageName', data.pageName);
    if (data.department) formData.append('department', data.department);
    if (data.code) formData.append('code', data.code);
    if (data.attachment instanceof File) {
      formData.append('attachment', data.attachment);
    }
    return api.post('/permissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getPermissionRequests: () => api.get('/permissions').then(res => res.data),
  updatePermissionRequestStatus: (id, status) => api.put(`/permissions/${id}/status`, { status }).then(res => res.data),
};

// Errand Requests API
export const errandRequestsAPI = {
  createErrandRequest: (data) => api.post('/errand-requests', data).then(res => res.data),
  getErrandRequests: () => api.get('/errand-requests').then(res => res.data),
  updateErrandRequestStatus: (id, status) => api.put(`/errand-requests/${id}/status`, { status }).then(res => res.data),
};

// Errands API (new, separate from errandRequestsAPI)
export const errandsAPI = {
  getErrands: () => api.get('/errands').then(res => res.data),
  addErrand: (data) => api.post('/errands', data).then(res => res.data),
  updateErrand: (id, data) => api.put(`/errands/${id}`, data).then(res => res.data),
  deleteErrand: (id) => api.delete(`/errands/${id}`).then(res => res.data),
};

// User Settings API
export const userSettingsAPI = {
  getUserSettings: () => api.get('/users/settings/me').then(res => res.data),
  updateUserSettings: (data) => api.put('/users/settings/me', data).then(res => res.data),
};

// Shared Tasks API
export const sharedTasksAPI = {
  getSharedTasks: () => api.get('/shared-tasks').then(res => res.data),
  createSharedTask: (taskData) => api.post('/shared-tasks', taskData).then(res => res.data),
  updateSharedTask: (id, taskData) => api.put(`/shared-tasks/${id}`, taskData).then(res => res.data),
  deleteSharedTask: (id) => api.delete(`/shared-tasks/${id}`).then(res => res.data),
};

// Notification API
export const notificationAPI = {
  getNotification: () => api.get('/notification').then(res => res.data),
  setNotification: (text) => api.post('/notification', { text }).then(res => res.data),
};

// Manager Permissions API
export const managerPermissionsAPI = {
  assign: (data) => api.post('/manager-permissions/assign', data).then(res => res.data),
  list: (managerId) => api.get(`/manager-permissions/${managerId}`).then(res => res.data),
  remove: (id) => api.delete(`/manager-permissions/${id}`).then(res => res.data),
};

// Anydesk Devices API
export const anydeskAPI = {
  getDevices: () => api.get('/anydesk-devices').then(res => res.data),
  addDevice: (device) => api.post('/anydesk-devices', device).then(res => res.data),
  updateDevice: (id, device) => api.put(`/anydesk-devices/${id}`, device).then(res => res.data),
  deleteDevice: (id) => api.delete(`/anydesk-devices/${id}`).then(res => res.data),
};

export default api;
