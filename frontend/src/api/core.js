import api from './axios'

// Departments
export const getDepartments    = ()       => api.get('/departments/')
export const createDepartment  = (data)   => api.post('/departments/', data)
export const updateDepartment  = (id, d)  => api.patch(`/departments/${id}/`, d)
export const deleteDepartment  = (id)     => api.delete(`/departments/${id}/`)

// Courses
export const getCourses        = (params) => api.get('/courses/', { params })
export const createCourse      = (data)   => api.post('/courses/', data)
export const updateCourse      = (id, d)  => api.patch(`/courses/${id}/`, d)
export const deleteCourse      = (id)     => api.delete(`/courses/${id}/`)

// Course Assignments
export const getAssignments    = (params) => api.get('/courses/assignments/', { params })
export const createAssignment  = (data)   => api.post('/courses/assignments/', data)
export const updateAssignment  = (id, d)  => api.patch(`/courses/assignments/${id}/`, d)
export const deleteAssignment  = (id)     => api.delete(`/courses/assignments/${id}/`)
export const getMyAssignments  = ()       => api.get('/courses/my-assignments/')

// Users (Admin only CRUD)
export const getUsers          = (params) => api.get('/users/', { params })
export const createUser        = (data)   => api.post('/users/register/', data)
export const updateUser        = (id, d)  => api.patch(`/users/${id}/`, d)
export const deleteUser        = (id)     => api.delete(`/users/${id}/`)

// Safe minimal faculty directory — accessible to any authenticated role
export const getFacultyList    = (params) => api.get('/users/faculty-list/', { params })

// Profile
export const getMyProfile      = ()       => api.get('/auth/me/')
export const passwordChange    = (oldPassword, newPassword) =>
  api.post('/auth/password-change/', { old_password: oldPassword, new_password: newPassword })

