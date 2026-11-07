import axios from 'axios';

// Backend manzili
const API_BASE_URL = 'https://dental-crm-backend-5161.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json/',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
});

const noCacheParams = (params = {}) => ({
  headers: {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
  params: {
    ...params,
    _t: Date.now(),
  },
});

export const dentalApi = {
  // Statistika
  getStats: (date) => api.get('/appointments/stats/', noCacheParams(date ? { date } : {})),
  
  // Bugungi va haftalik qabullar
  getTodayAppointments: () => api.get('/appointments/today/', noCacheParams()),
  getAppointmentsForDate: (date) => api.get('/appointments/', noCacheParams({ date })),
  getWeekAppointments: () => api.get('/appointments/this_week/', noCacheParams()),
  
  // Qabul holatini o'zgartirish (PENDING, CONFIRMED, COMPLETED, CANCELLED)
  updateAppointmentStatus: (id, status) => api.patch(`/appointments/${id}/status/`, { status }),
  updateAppointment: (id, data) => api.patch(`/appointments/${id}/`, data),
  cancelAppointment: (id) => api.post(`/appointments/${id}/cancel/`),
  deleteAppointment: (id) => api.delete(`/appointments/${id}/`),
  sendAppointmentReminder: (id, initData) => api.post(
    `/appointments/${id}/send-reminder/`,
    {},
    { headers: { 'X-Telegram-Init-Data': initData } }
  ),
  
  // Yangi qabul yaratish
  createAppointment: (data) => api.post('/appointments/', data),

  // Bemorlar
  getPatients: (search = '') => api.get('/patients/', noCacheParams(search ? { search } : {})),
  getPatient: (id) => api.get(`/patients/${id}/`, noCacheParams()),
  createPatient: (data) => api.post('/patients/', data),

  // Bemor uchun rejalashtirilgan xizmat
  planPatientService: (data) => api.post('/appointments/plan-service/', data),
  updateTreatmentStatus: (id, status) => api.patch(`/treatments/${id}/`, { status }),

  // Bemor balansi va xizmat to'lovlari
  createPayment: (data) => api.post('/payments/', data),
  topUpBalance: (data) => api.post('/payments/', data),
  payTreatment: (treatmentId) => api.post('/payments/pay-treatment/', { treatment_id: treatmentId }),
};

export default api;