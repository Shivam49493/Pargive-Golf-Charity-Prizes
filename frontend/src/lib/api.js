import axios from 'axios'
import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
})

// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch (_) {}
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
)

// Auth — accepts optional explicit token to avoid timing issues
export const authApi = {
  getMe: (token) => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
    return api.get('/api/auth/me', config).then(r => r.data)
  },
  updateProfile: (data) => api.put('/api/auth/profile', data).then(r => r.data)
}

// Scores
export const scoresApi = {
  getAll: () => api.get('/api/scores').then(r => r.data.scores),
  add: (data) => api.post('/api/scores', data).then(r => r.data),
  update: (id, data) => api.put(`/api/scores/${id}`, data).then(r => r.data.score),
  delete: (id) => api.delete(`/api/scores/${id}`).then(r => r.data)
}

// Draws
export const drawsApi = {
  getPublished: () => api.get('/api/draws').then(r => r.data.draws),
  getLatest: () => api.get('/api/draws/latest').then(r => r.data),
  getMyEntries: () => api.get('/api/draws/my/entries').then(r => r.data.entries),
  getMyWinnings: () => api.get('/api/draws/my/winnings').then(r => r.data.winnings),
  uploadProof: (winnerId, proofUrl) =>
    api.put(`/api/draws/winners/${winnerId}/proof`, { proof_url: proofUrl }).then(r => r.data),
  adminGetAll: () => api.get('/api/draws/admin/all').then(r => r.data.draws),
  adminCreate: (data) => api.post('/api/draws/admin', data).then(r => r.data.draw),
  adminSimulate: (drawType) => api.post('/api/draws/admin/simulate', { draw_type: drawType }).then(r => r.data),
  adminGenerate: (drawId) => api.post(`/api/draws/admin/${drawId}/generate`).then(r => r.data),
  adminPublish: (drawId) => api.post(`/api/draws/admin/${drawId}/publish`).then(r => r.data),
  adminGetWinners: (drawId) => api.get(`/api/draws/admin/${drawId}/winners`).then(r => r.data.winners),
  adminVerifyWinner: (winnerId, data) => api.put(`/api/draws/admin/winners/${winnerId}/verify`, data).then(r => r.data),
  adminUpdatePayment: (winnerId, paymentStatus) =>
    api.put(`/api/draws/admin/winners/${winnerId}/payment`, { payment_status: paymentStatus }).then(r => r.data)
}

// Charities
export const charitiesApi = {
  getAll: (params) => api.get('/api/charities', { params }).then(r => r.data.charities),
  getCategories: () => api.get('/api/charities/categories').then(r => r.data.categories),
  getBySlug: (slug) => api.get(`/api/charities/${slug}`).then(r => r.data.charity),
  getMySelection: () => api.get('/api/charities/my/selection').then(r => r.data.selection),
  select: (data) => api.post('/api/charities/select', data).then(r => r.data.selection),
  adminCreate: (data) => api.post('/api/charities/admin', data).then(r => r.data.charity),
  adminUpdate: (id, data) => api.put(`/api/charities/admin/${id}`, data).then(r => r.data.charity),
  adminDelete: (id) => api.delete(`/api/charities/admin/${id}`).then(r => r.data)
}

// Subscriptions
export const subscriptionsApi = {
  getStatus: () => api.get('/api/subscriptions/status').then(r => r.data.subscription),
  createCheckout: (plan) => api.post('/api/subscriptions/checkout', { plan }).then(r => r.data),
  createPortal: () => api.post('/api/subscriptions/portal').then(r => r.data),
  adminGetAll: (params) => api.get('/api/subscriptions/admin/all', { params }).then(r => r.data),
  adminUpdate: (userId, data) => api.put(`/api/subscriptions/admin/${userId}`, data).then(r => r.data)
}

// Admin
export const adminApi = {
  getStats: () => api.get('/api/admin/stats').then(r => r.data.stats),
  getUsers: (params) => api.get('/api/admin/users', { params }).then(r => r.data),
  getUser: (id) => api.get(`/api/admin/users/${id}`).then(r => r.data),
  updateUser: (id, data) => api.put(`/api/admin/users/${id}`, data).then(r => r.data),
  getWinners: (params) => api.get('/api/admin/winners', { params }).then(r => r.data.winners)
}

export default api