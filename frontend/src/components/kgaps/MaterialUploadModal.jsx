import { useState } from 'react'
import { uploadMaterial, updateMaterial } from '../../api/kgaps'

const MATERIAL_TYPES = [
  { value: 'PPT', label: 'Presentation (PPT)' },
  { value: 'NOTES', label: 'Notes' },
  { value: 'LAB', label: 'Lab Instructions' },
  { value: 'VIDEO', label: 'Video Link' },
  { value: 'REFERENCE', label: 'Reference' },
]

/**
 * MaterialUploadModal — handles both new upload and editing an existing material.
 *
 * Props:
 *   topic        — the topic object (required for new uploads)
 *   editMaterial — existing material object (pass this to enter edit mode)
 *   onClose      — close handler
 *   onSuccess    — called after a successful save
 */
export default function MaterialUploadModal({ topic, editMaterial, onClose, onSuccess }) {
  const isEdit = !!editMaterial

  const [form, setForm] = useState({
    material_type: editMaterial?.material_type ?? 'NOTES',
    title: editMaterial?.title ?? '',
    external_url: editMaterial?.external_url ?? '',
  })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isLinkType = form.material_type === 'VIDEO' || form.material_type === 'REFERENCE'

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // For new upload: file required unless link type
    if (!isEdit && !isLinkType && !file) {
      setError('Please select a file to upload.')
      return
    }

    const fd = new FormData()
    fd.append('material_type', form.material_type)
    fd.append('title', form.title)

    if (isLinkType) {
      fd.append('external_url', form.external_url)
    } else if (file) {
      fd.append('file_url', file)
    }

    if (!isEdit) {
      fd.append('topic', topic.id)
    }

    setLoading(true)
    try {
      if (isEdit) {
        await updateMaterial(editMaterial.id, fd)
      } else {
        await uploadMaterial(fd)
      }
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || (isEdit ? 'Update failed.' : 'Upload failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const topicTitle = isEdit ? editMaterial.topic_title : topic?.topic_title

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">{isEdit ? 'Edit Material' : 'Upload Material'}</h2>
            {topicTitle && <p className="text-xs text-gray-500 mt-0.5">{topicTitle}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              name="material_type"
              value={form.material_type}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MATERIAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Unit 1 Slides"
            />
          </div>

          {isLinkType ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                name="external_url"
                value={form.external_url}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File
                {isEdit && <span className="text-gray-400 font-normal ml-1">(leave blank to keep existing file)</span>}
              </label>
              {isEdit && editMaterial?.file_url && !file && (
                <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                  <span>Current:</span>
                  <a href={editMaterial.file_url} target="_blank" rel="noreferrer"
                    className="text-blue-600 hover:underline truncate max-w-[220px]">
                    View uploaded file
                  </a>
                </p>
              )}
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-sm text-gray-600 file:mr-3 file:border-0 file:bg-blue-50 file:text-blue-700 file:rounded file:px-3 file:py-1 file:text-sm"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (isEdit ? 'Saving…' : 'Uploading…') : (isEdit ? 'Save Changes' : 'Upload')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
