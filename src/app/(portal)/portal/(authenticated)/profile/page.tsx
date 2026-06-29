'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Mail, Building2, Phone, Briefcase } from 'lucide-react'

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({ full_name: '', phone: '', designation: '' })
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetch('/api/portal/me').then(r => r.json()).then(data => {
      setProfile(data)
      setForm({ full_name: data.full_name ?? '', phone: data.phone ?? '', designation: data.designation ?? '' })
    })
  }, [])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/portal/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success('Profile updated')
      const data = await res.json()
      setProfile((p: any) => ({ ...p, ...data }))
    } else {
      toast.error('Failed to update profile')
    }
    setSaving(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setChangingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password changed successfully')
      setNewPassword('')
    }
    setChangingPassword(false)
  }

  if (!profile) return (
    <div className="flex items-center justify-center h-48">
      <div className="text-sm text-zinc-400">Loading…</div>
    </div>
  )

  return (
    <div className="space-y-5 lg:space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl lg:text-2xl font-semibold text-zinc-900">My profile</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your account information</p>
      </div>

      {/* Info card */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-zinc-100">
          <div className="w-12 lg:w-14 h-12 lg:h-14 rounded-full bg-zinc-900 flex items-center justify-center text-white text-lg lg:text-xl font-medium shrink-0">
            {profile.full_name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-zinc-900 truncate">{profile.full_name}</div>
            <div className="text-sm text-zinc-500">{profile.designation || 'Employee'}</div>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { icon: Mail, label: 'Email', value: profile.email },
            { icon: Building2, label: 'Branch', value: profile.branch?.name ?? '—' },
            { icon: Briefcase, label: 'Designation', value: profile.designation ?? '—' },
            { icon: Phone, label: 'Phone', value: profile.phone ?? '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon size={15} className="text-zinc-400 shrink-0" />
              <div className="text-sm text-zinc-500 w-20 lg:w-24 shrink-0">{label}</div>
              <div className="text-sm text-zinc-800 truncate">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit profile */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 lg:p-6">
        <h2 className="font-medium text-zinc-900 mb-4">Edit information</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {[
            { key: 'full_name', label: 'Full name', type: 'text', placeholder: 'Your full name' },
            { key: 'designation', label: 'Designation', type: 'text', placeholder: 'e.g. Branch Manager' },
            { key: 'phone', label: 'Phone number', type: 'tel', placeholder: '+92 300 0000000' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">{label}</label>
              <input type={type} value={(form as any)[key]} placeholder={placeholder}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
          ))}
          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 lg:p-6">
        <h2 className="font-medium text-zinc-900 mb-4">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">New password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="Min 6 characters" minLength={6} required />
          </div>
          <button type="submit" disabled={changingPassword}
            className="w-full py-2.5 border border-zinc-200 hover:bg-zinc-50 disabled:opacity-60 text-zinc-800 text-sm font-medium rounded-lg transition-colors">
            {changingPassword ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}