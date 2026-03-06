import api from './axios'

export const getHandlingEntries = (params) =>
  api.get('/kgaps/handling/', { params })

export const logHandling = (data) =>
  api.post('/kgaps/handling/', data)

export const deleteHandling = (id) =>
  api.delete(`/kgaps/handling/${id}/`)

export const getProgress = (params) =>
  api.get('/kgaps/handling/progress/', { params })

export const getHandlingVerificationQueue = () =>
  api.get('/kgaps/handling/verifications/')

export const verifyHandling = (id, data) =>
  api.patch(`/kgaps/handling/verifications/${id}/action/`, data)
