import api from './axios'

export const getPeriods = () => api.get('/scheduler/periods/')

// Timetables
export const getTimetables = () => api.get('/scheduler/timetables/')
export const getTimetable = (id) => api.get(`/scheduler/timetables/${id}/`)
export const setupTimetable = (data) => api.post('/scheduler/timetables/setup/', data)

// Daily Entries
export const getDailyEntries = (params) => api.get('/scheduler/daily-entries/', { params })
export const logDailyEntry = (data) => api.post('/scheduler/daily-entries/', data)
export const deleteDailyEntry = (id) => api.delete(`/scheduler/daily-entries/${id}/`)

// Swap Requests
export const getSwapRequests = () => api.get('/scheduler/swaps/')
export const createSwapRequest = (data) => api.post('/scheduler/swaps/', data)
export const actionSwapRequest = (id, data) => api.patch(`/scheduler/swaps/${id}/action/`, data)

// Extra Classes
export const getExtraClasses = () => api.get('/scheduler/extra-classes/')
export const requestExtraClass = (data) => api.post('/scheduler/extra-classes/', data)
export const actionExtraClass = (id, data) => api.patch(`/scheduler/extra-classes/${id}/action/`, data)
