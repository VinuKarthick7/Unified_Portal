import api from './axios'

// Role-aware dashboard stat counts
export const getDashboardStats = () => api.get('/analytics/stats/')

// HOD/Admin pending items inbox
export const getHODInbox = () => api.get('/analytics/hod-inbox/')

// Faculty "my day" overview
export const getMyDay = () => api.get('/analytics/my-day/')

// Phase 5 — Analytics page
export const getModuleSummary     = () => api.get('/analytics/summary/')
export const getTaskAnalytics     = () => api.get('/analytics/tasks/')
export const getWorkloadTrend     = () => api.get('/analytics/workload/')
export const getDepartmentOverview = () => api.get('/analytics/departments/')
