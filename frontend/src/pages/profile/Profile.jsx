/**
 * Profile.jsx — User profile & settings page.
 * Features: view profile info, change password, account details.
 */
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { passwordChange } from '../../api/core'
import { PageHeader } from '../../components/ui/PageHeader'
import { useToast } from '../../components/ui/Toast'

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  HOD: 'Head of Department',
  FACULTY: 'Faculty Member',
  COORDINATOR: 'Coordinator',
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-4 py-3 border-b border-slate-100 last:border-0">
      <dt className="text-xs font-semibold text-slate-500 sm:w-36 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-slate-800">{value || <span className="text-slate-400 italic">Not set</span>}</dd>
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const toast = useToast()

  const [form, setForm]     = useState({ old_password: '', new_password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const handleChange = e => {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
    setErrors(p => ({ ...p, [name]: undefined }))
  }

  const handlePasswordSubmit = async e => {
    e.preventDefault()
    const errs = {}
    if (!form.old_password) errs.old_password = 'Required'
    if (form.new_password.length < 8) errs.new_password = 'Must be at least 8 characters'
    if (form.new_password !== form.confirm) errs.confirm = 'Passwords do not match'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      await passwordChange(form.old_password, form.new_password)
      toast.success('Password changed successfully.')
      setForm({ old_password: '', new_password: '', confirm: '' })
    } catch (err) {
      const data = err.response?.data
      if (data?.old_password) setErrors({ old_password: data.old_password[0] })
      else toast.error(data?.detail || 'Failed to change password.')
    } finally {
      setSaving(false)
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.username?.[0] ?? 'U').toUpperCase()

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <PageHeader
        title="My Profile"
        subtitle="View your account details and manage settings"
      />

      {/* ── Account info card ──────────────────────────── */}
      <section className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user?.full_name || user?.username}</h2>
            <p className="text-sm text-slate-500">{ROLE_LABELS[user?.role] ?? user?.role}</p>
          </div>
        </div>

        <dl>
          <InfoRow label="Username"   value={user?.username} />
          <InfoRow label="Full name"  value={user?.full_name} />
          <InfoRow label="Email"      value={user?.email} />
          <InfoRow label="Role"       value={ROLE_LABELS[user?.role] ?? user?.role} />
          <InfoRow label="Department" value={user?.department_name} />
          <InfoRow label="Employee ID" value={user?.employee_id} />
        </dl>
      </section>

      {/* ── Change password card ───────────────────────── */}
      <section className="card p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Change Password</h3>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {[
            { name: 'old_password', label: 'Current password', placeholder: 'Enter current password' },
            { name: 'new_password', label: 'New password',     placeholder: 'Minimum 8 characters'    },
            { name: 'confirm',      label: 'Confirm new password', placeholder: 'Re-enter new password' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-xs font-medium text-slate-700 mb-1">{f.label}</label>
              <input
                type="password"
                name={f.name}
                value={form[f.name]}
                onChange={handleChange}
                placeholder={f.placeholder}
                autoComplete="off"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors[f.name] ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white'
                }`}
              />
              {errors[f.name] && (
                <p className="text-xs text-rose-600 mt-1">{errors[f.name]}</p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </section>
    </div>
  )
}
