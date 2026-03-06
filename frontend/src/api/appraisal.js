import api from './axios'

// Templates
export const getTemplates = (params) => api.get('/appraisal/templates/', { params })
export const getTemplate  = (id)     => api.get(`/appraisal/templates/${id}/`)
export const createTemplate = (data) => api.post('/appraisal/templates/', data)
export const updateTemplate = (id, data) => api.patch(`/appraisal/templates/${id}/`, data)
export const deleteTemplate = (id)   => api.delete(`/appraisal/templates/${id}/`)

// Criteria (nested)
export const getCriteria    = (templateId)       => api.get(`/appraisal/templates/${templateId}/criteria/`)
export const addCriteria    = (templateId, data) => api.post(`/appraisal/templates/${templateId}/criteria/`, data)
export const updateCriteria = (templateId, id, data) => api.patch(`/appraisal/templates/${templateId}/criteria/${id}/`, data)
export const deleteCriteria = (templateId, id)   => api.delete(`/appraisal/templates/${templateId}/criteria/${id}/`)

// Submissions
export const getSubmissions    = (params) => api.get('/appraisal/submissions/', { params })
export const startSubmission   = (templateId) => api.post('/appraisal/submissions/', { template: templateId })
export const getSubmission     = (id)    => api.get(`/appraisal/submissions/${id}/`)
export const selfUpdateSubmission = (id, data) => api.patch(`/appraisal/submissions/${id}/self-update/`, data)
export const submitAppraisal   = (id)    => api.post(`/appraisal/submissions/${id}/submit/`)
export const reviewAppraisal   = (id, data) => api.post(`/appraisal/submissions/${id}/review/`, data)
export const finaliseAppraisal = (id, data) => api.post(`/appraisal/submissions/${id}/finalise/`, data)
export const getAppraisalReport = (id)  => api.get(`/appraisal/submissions/${id}/report/`, { responseType: 'blob' })

// Stats
export const getAppraisalStats = () => api.get('/appraisal/stats/')
