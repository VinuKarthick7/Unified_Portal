import api from './axios'

// Tasks
export const getTasks = (params) => api.get('/tasks/', { params })
export const getTask = (id) => api.get(`/tasks/${id}/`)
export const createTask = (data) => api.post('/tasks/', data)
export const updateTask = (id, data) => api.patch(`/tasks/${id}/`, data)
export const deleteTask = (id) => api.delete(`/tasks/${id}/`)

// Assignments
export const getAssignments = (taskId) => api.get(`/tasks/${taskId}/assignments/`)
export const addAssignment = (taskId, data) => api.post(`/tasks/${taskId}/assignments/`, data)
export const updateAssignment = (taskId, id, data) => api.patch(`/tasks/${taskId}/assignments/${id}/`, data)

// Comments
export const getComments = (taskId) => api.get(`/tasks/${taskId}/comments/`)
export const addComment = (taskId, data) => api.post(`/tasks/${taskId}/comments/`, data)

// Attachments
export const getAttachments = (taskId) => api.get(`/tasks/${taskId}/attachments/`)
export const uploadAttachment = (taskId, formData) =>
  api.post(`/tasks/${taskId}/attachments/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// Stats
export const getTaskStats = () => api.get('/tasks/stats/')

// SubTasks
export const getSubtasks    = (taskId)       => api.get(`/tasks/${taskId}/subtasks/`)
export const addSubtask     = (taskId, data) => api.post(`/tasks/${taskId}/subtasks/`, data)
export const updateSubtask  = (taskId, id, data) => api.patch(`/tasks/${taskId}/subtasks/${id}/`, data)
export const deleteSubtask  = (taskId, id)   => api.delete(`/tasks/${taskId}/subtasks/${id}/`)

// History
export const getTaskHistory = (taskId) => api.get(`/tasks/${taskId}/history/`)
