import api from './axios'

// Course structure (full Unit → Topic tree)
export const getCourseStructure = (courseId) =>
  api.get(`/kgaps/creation/structure/${courseId}/`)

// Units
export const getUnits = (params) => api.get('/kgaps/creation/units/', { params })
export const createUnit = (data) => api.post('/kgaps/creation/units/', data)
export const updateUnit = (id, data) => api.patch(`/kgaps/creation/units/${id}/`, data)
export const deleteUnit = (id) => api.delete(`/kgaps/creation/units/${id}/`)

// Topics
export const getTopics = (params) => api.get('/kgaps/creation/topics/', { params })
export const createTopic = (data) => api.post('/kgaps/creation/topics/', data)
export const updateTopic = (id, data) => api.patch(`/kgaps/creation/topics/${id}/`, data)
export const deleteTopic = (id) => api.delete(`/kgaps/creation/topics/${id}/`)

// Materials
export const getMaterials = (params) => api.get('/kgaps/creation/materials/', { params })
export const uploadMaterial = (formData) =>
  api.post('/kgaps/creation/materials/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const deleteMaterial = (id) => api.delete(`/kgaps/creation/materials/${id}/`)

// Verification
export const getVerificationQueue = (status = 'PENDING') =>
  api.get('/kgaps/creation/verifications/', { params: { status } })
export const verifyMaterial = (id, data) =>
  api.patch(`/kgaps/creation/verifications/${id}/action/`, data)
