/**
 * TaskDetail.jsx — Full task view
 * - Info panel: title, description, priority, status, due date, category, department
 * - Assigned faculty list + status badges; faculty can update their own assignment status
 * - Comments thread (faculty sees public; HOD/Admin can post internal)
 * - Attachments list + upload
 * - HOD/Admin: Edit / Delete buttons
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getTask, deleteTask,
  updateAssignment,
  getComments, addComment,
  getAttachments, uploadAttachment,
  getSubtasks, addSubtask, updateSubtask, deleteSubtask,
  getTaskHistory,
} from '../../api/tasks'
import Badge from '../../components/Badge'

const PRIORITY_COLOR = {
  LOW: 'bg-blue-100 text-blue-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}
const STATUS_VARIANT = {
  OPEN: 'pending', IN_PROGRESS: 'info', COMPLETED: 'approved', CANCELLED: 'rejected',
}
const ASSIGN_STATUS_OPTIONS = ['PENDING', 'ACCEPTED', 'COMPLETED', 'DECLINED']

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [task, setTask] = useState(null)
  const [comments, setComments] = useState([])
  const [attachments, setAttachments] = useState([])
  const [subtasks, setSubtasks] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const [commentText, setCommentText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [postingComment, setPostingComment] = useState(false)

  const [updatingAssignment, setUpdatingAssignment] = useState(null)

  const [newSubtask, setNewSubtask] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)

  const fileInputRef = useRef(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  const isManager = user?.role === 'ADMIN' || user?.role === 'HOD'

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [t, c, a, s, h] = await Promise.all([
        getTask(id),
        getComments(id),
        getAttachments(id),
        getSubtasks(id),
        getTaskHistory(id),
      ])
      setTask(t.data)
      setComments(c.data)
      setAttachments(a.data)
      setSubtasks(s.data)
      setHistory(h.data)
    } catch {
      navigate('/tasks')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { loadAll() }, [loadAll])

  // My assignment on this task
  const myAssignment = task?.assignments?.find(
    (a) => a.assignee === user?.id
  )

  const handleAssignmentStatus = async (assignmentId, taskId, newStatus) => {
    setUpdatingAssignment(assignmentId)
    try {
      await updateAssignment(taskId, assignmentId, { status: newStatus })
      loadAll()
    } finally {
      setUpdatingAssignment(null)
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setPostingComment(true)
    try {
      await addComment(id, { content: commentText, is_internal: isInternal })
      setCommentText('')
      setIsInternal(false)
      loadAll()
    } finally {
      setPostingComment(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('filename', file.name)
      await uploadAttachment(id, fd)
      loadAll()
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete task "${task?.title}"?`)) return
    try {
      await deleteTask(id)
      navigate('/tasks')
    } catch (err) {
      alert(err.response?.data?.detail || 'Cannot delete.')
    }
  }

  const handleAddSubtask = async (e) => {
    e.preventDefault()
    if (!newSubtask.trim()) return
    setAddingSubtask(true)
    try {
      await addSubtask(id, { title: newSubtask.trim() })
      setNewSubtask('')
      loadAll()
    } finally {
      setAddingSubtask(false)
    }
  }

  const handleToggleSubtask = async (subtask) => {
    try {
      await updateSubtask(id, subtask.id, { is_done: !subtask.is_done })
      loadAll()
    } catch { /* noop */ }
  }

  const handleDeleteSubtask = async (subtask) => {
    try {
      await deleteSubtask(id, subtask.id)
      loadAll()
    } catch { /* noop */ }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (!task) return null

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => navigate('/tasks')}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← Back to tasks
      </button>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${PRIORITY_COLOR[task.priority]}`}>
                {task.priority}
              </span>
              <Badge label={task.status.replace('_', ' ')} variant={STATUS_VARIANT[task.status]} />
              {task.category && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{task.category}</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-800">{task.title}</h1>
            {task.description && (
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{task.description}</p>
            )}
          </div>
          {isManager && (
            <div className="flex gap-2 shrink-0">
              <button onClick={() => navigate(`/tasks/${id}/edit`)}
                className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                Edit
              </button>
              <button onClick={handleDelete}
                className="text-sm border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50">
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
          {task.due_date && (
            <span>
              Due:{' '}
              <span className={new Date(task.due_date) < new Date() && task.status !== 'COMPLETED' ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                {task.due_date}
              </span>
            </span>
          )}
          {task.department_name && <span>Dept: <span className="text-gray-700">{task.department_name}</span></span>}
          <span>Created by: <span className="text-gray-700">{task.created_by_name}</span></span>
          <span>Updated: <span className="text-gray-700">{new Date(task.updated_at).toLocaleDateString()}</span></span>
        </div>
      </div>

      {/* Assignments */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Assigned Faculty ({task.assignments?.length})</h2>
        {task.assignments?.length === 0 ? (
          <p className="text-sm text-gray-400">No one assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {task.assignments?.map((a) => {
              const isMe = a.assignee === user?.id
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {a.assignee_name}
                      {isMe && <span className="ml-1.5 text-xs text-blue-600">(you)</span>}
                    </p>
                    <p className="text-xs text-gray-400">{a.assignee_email}</p>
                    {a.notes && <p className="text-xs text-gray-500 mt-0.5 italic">"{a.notes}"</p>}
                  </div>
                  <Badge
                    label={a.status}
                    variant={a.status === 'COMPLETED' ? 'approved' : a.status === 'DECLINED' ? 'rejected' : 'pending'}
                  />
                  {/* Faculty can update their own status */}
                  {isMe && a.status !== 'COMPLETED' && a.status !== 'DECLINED' && (
                    <select
                      value={a.status}
                      disabled={updatingAssignment === a.id}
                      onChange={(e) => handleAssignmentStatus(a.id, task.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {ASSIGN_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Attachments */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Attachments ({attachments.length})</h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              id="attach-upload"
            />
            <label htmlFor="attach-upload"
              className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 cursor-pointer">
              {uploadingFile ? 'Uploading…' : '+ Attach file'}
            </label>
          </div>
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-gray-400">No attachments.</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">📎</span>
                <a href={a.file} target="_blank" rel="noreferrer"
                  className="text-blue-600 hover:underline truncate max-w-xs">
                  {a.filename}
                </a>
                <span className="text-xs text-gray-400 ml-auto">{a.uploaded_by_name} · {new Date(a.uploaded_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subtask Checklist */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-4">
          Checklist ({subtasks.filter(s => s.is_done).length}/{subtasks.length})
        </h2>

        {/* Progress bar */}
        {subtasks.length > 0 && (
          <div className="mb-4 w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${subtasks.length ? Math.round(subtasks.filter(s => s.is_done).length / subtasks.length * 100) : 0}%` }}
            />
          </div>
        )}

        <div className="space-y-2 mb-4">
          {subtasks.length === 0 && (
            <p className="text-sm text-gray-400">No checklist items yet.</p>
          )}
          {subtasks.map((st) => (
            <div key={st.id} className="flex items-center gap-3 group">
              <input
                type="checkbox"
                checked={st.is_done}
                onChange={() => handleToggleSubtask(st)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
              />
              <span className={`text-sm flex-1 ${st.is_done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {st.title}
              </span>
              {st.assigned_to_name && (
                <span className="text-xs text-gray-400 hidden group-hover:inline">{st.assigned_to_name}</span>
              )}
              <button
                onClick={() => handleDeleteSubtask(st)}
                className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Add subtask */}
        <form onSubmit={handleAddSubtask} className="flex gap-2">
          <input
            type="text"
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            placeholder="Add checklist item…"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={addingSubtask || !newSubtask.trim()}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {addingSubtask ? '…' : '+ Add'}
          </button>
        </form>
      </div>

      {/* Activity History */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Activity ({history.length})</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">No activity recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1 w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-gray-700">{h.actor_name || 'System'}</span>
                  {' '}
                  <span className="text-gray-500">{h.detail || h.action.replace(/_/g, ' ').toLowerCase()}</span>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(h.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Comments ({comments.length})</h2>

        {/* Comment thread */}
        <div className="space-y-3 mb-5">
          {comments.length === 0 && (
            <p className="text-sm text-gray-400">No comments yet. Start the conversation.</p>
          )}
          {comments.map((c) => (
            <div key={c.id}
              className={`rounded-xl p-3 ${c.is_internal ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-800">{c.author_name}</span>
                <span className="text-xs text-gray-400">{c.author_role}</span>
                {c.is_internal && (
                  <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">internal</span>
                )}
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>

        {/* Add comment */}
        <form onSubmit={handleComment} className="space-y-2">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
            placeholder="Write a comment…"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex items-center gap-3">
            {isManager && (
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded border-gray-300" />
                Internal (HOD/Admin only)
              </label>
            )}
            <button type="submit" disabled={postingComment || !commentText.trim()}
              className="ml-auto bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {postingComment ? 'Posting…' : 'Comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
