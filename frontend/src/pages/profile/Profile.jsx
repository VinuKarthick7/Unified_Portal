import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { updateMyProfile } from '../../api/core'
import { useToast } from '../../components/ui/Toast'

const ROLE_META = {
  ADMIN:       { label: 'Administrator',      bg: '#ede9fe', color: '#6d28d9' },
  HOD:         { label: 'Head of Department', bg: '#dbeafe', color: '#1d4ed8' },
  COORDINATOR: { label: 'Coordinator',        bg: '#ccfbf1', color: '#0f766e' },
  FACULTY:     { label: 'Faculty Member',     bg: '#ffedd5', color: '#c2410c' },
}

const GRADIENTS = {
  ADMIN:       'linear-gradient(135deg, #7c3aed, #a855f7)',
  HOD:         'linear-gradient(135deg, #1d4ed8, #6366f1)',
  COORDINATOR: 'linear-gradient(135deg, #0f766e, #0ea5e9)',
  FACULTY:     'linear-gradient(135deg, #ea580c, #f59e0b)',
}

function Field({ icon, label, value, children }) {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: '#f3f4f6' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
        {children ?? (
          <p className="text-sm font-medium text-gray-800 truncate">
            {value || <span className="text-gray-400 italic font-normal">Not set</span>}
          </p>
        )}
      </div>
    </div>
  )
}

const IC = {
  user:    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  at:      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94"/></svg>,
  phone:   <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 13a19.79 19.79 0 01-3.07-8.67A2 2 0 012 2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  building:<svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>,
  badge:   <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>,
  id:      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M6 7V5a6 6 0 0112 0v2"/><circle cx="12" cy="14" r="2"/><path d="M9 20h6"/></svg>,
  pencil:  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  check:   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  x:       <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
}

export default function Profile() {
  const { user, refreshProfile } = useAuth()
  const toast = useToast()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' })
  const [saving, setSaving] = useState(false)

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'User'
  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const roleMeta = ROLE_META[user?.role] ?? { label: user?.role, bg: '#f3f4f6', color: '#374151' }
  const gradient = GRADIENTS[user?.role] ?? GRADIENTS.FACULTY

  const startEdit = () => {
    setForm({
      first_name: user?.first_name ?? '',
      last_name:  user?.last_name  ?? '',
      phone:      user?.phone      ?? '',
    })
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const saveEdit = async () => {
    setSaving(true)
    try {
      await updateMyProfile({
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        phone:      form.phone.trim(),
      })
      await refreshProfile()
      toast.success('Profile updated.')
      setEditing(false)
    } catch {
      toast.error('Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">

      {/* ── Hero card ── */}
      <div className="rounded-2xl shadow-sm relative" style={{ border: '1px solid rgba(0,0,0,0.07)' }}>

        {/* Gradient banner */}
        <div className="h-24 rounded-t-2xl" style={{ background: gradient }} />

        {/* Avatar — absolutely positioned straddling the banner/white boundary */}
        <div
          className="absolute left-6 w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-md ring-4 ring-white z-10"
          style={{ top: '56px', background: gradient }}
        >
          {initials}
        </div>

        {/* White section */}
        <div className="px-6 pb-5 pt-14 rounded-b-2xl" style={{ background: '#fff' }}>

          {/* Edit / Save / Cancel buttons — aligned right */}
          <div className="flex justify-end mb-3">
            {!editing ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              >
                {IC.pencil} Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
                >
                  {IC.x} Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: gradient }}
                >
                  {saving ? (
                    <span className="w-3 h-3 rounded-full border border-t-white border-white/30 animate-spin" />
                  ) : IC.check}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {/* Name & badges */}
          <h1 className="text-lg font-bold text-gray-900">{fullName}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: roleMeta.bg, color: roleMeta.color }}>
              {roleMeta.label}
            </span>
            {user?.department_name && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {user.department_name}
              </span>
            )}
            {!user?.is_active && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-600">Inactive</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Info card ── */}
      <div className="rounded-2xl bg-white p-5 space-y-0" style={{ border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Account Details</p>

        {/* Name — editable */}
        <Field icon={IC.user} label="First Name">
          {editing ? (
            <input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
              placeholder="First name"
              className="w-full text-sm font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          ) : (
            <p className="text-sm font-medium text-gray-800">{user?.first_name || <span className="text-gray-400 italic font-normal">Not set</span>}</p>
          )}
        </Field>

        <Field icon={IC.user} label="Last Name">
          {editing ? (
            <input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
              placeholder="Last name"
              className="w-full text-sm font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          ) : (
            <p className="text-sm font-medium text-gray-800">{user?.last_name || <span className="text-gray-400 italic font-normal">Not set</span>}</p>
          )}
        </Field>

        {/* Read-only fields */}
        <Field icon={IC.at}       label="Email"      value={user?.email} />
        <Field icon={IC.id}       label="Username"   value={user?.username} />
        <Field icon={IC.building} label="Department" value={user?.department_name} />
        <Field icon={IC.badge}    label="Role"       value={roleMeta.label} />

        {/* Phone — editable */}
        <Field icon={IC.phone} label="Phone">
          {editing ? (
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="e.g. +91 98765 43210"
              type="tel"
              className="w-full text-sm font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          ) : (
            <p className="text-sm font-medium text-gray-800">{user?.phone || <span className="text-gray-400 italic font-normal">Not set</span>}</p>
          )}
        </Field>
      </div>

      {/* Editable hint */}
      {!editing && (
        <p className="text-center text-xs text-gray-400">
          Name and phone can be updated. Email, role, and department are managed by your administrator.
        </p>
      )}
    </div>
  )
}
