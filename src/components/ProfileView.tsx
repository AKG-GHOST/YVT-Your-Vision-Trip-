import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Smartphone, Check, LogOut, Loader2, ShieldCheck } from 'lucide-react'
import type { User as UserType, Trip, WishlistItem } from '../types'

type Props = {
  user: UserType | null
  trips: Trip[]
  wishlist: WishlistItem[]
  onLogout: () => void
  onUpdateProfile: (name: string, currentPassword?: string, newPassword?: string) => Promise<void>
}

export default function ProfileView({
  user,
  trips,
  wishlist,
  onLogout,
  onUpdateProfile,
}: Props) {
  const [downloaded, setDownloaded] = useState(false)
  
  // Profile update state
  const [name, setName] = useState(user?.name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function exportTripsJSON() {
    const backupData = {
      user: { name: user?.name, email: user?.email },
      exported_at: new Date().toISOString(),
      trips,
      wishlist,
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `triptrail-${user?.email || 'backup'}-${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2500)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    setSaving(true)

    try {
      await onUpdateProfile(name, currentPassword || undefined, newPassword || undefined)
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' })
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 pb-28 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <span className="text-[10px] font-mono tracking-widest text-[#A89682] uppercase">
          ACCOUNT & SECURITY
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2B231D] mt-1">
          Traveler Profile
        </h1>
      </div>

      {/* User Card */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-white border border-[#EDE5DB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#2B231D] text-white text-xl font-bold flex items-center justify-center shadow-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#2B231D]">{user.name}</h2>
              <p className="text-xs text-[#8A7968] font-mono">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#EDE5DB] text-[10px] font-mono text-[#6B5D4F]">
                  {trips.length} {trips.length === 1 ? 'Trip' : 'Trips'} Logged
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#EDE5DB] text-[10px] font-mono text-[#6B5D4F]">
                  {wishlist.length} Wishlist {wishlist.length === 1 ? 'Pin' : 'Pins'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to sign out?')) {
                onLogout()
              }
            }}
            className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </motion.div>
      )}

      {/* Profile & Password Update Form */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSaveProfile}
        className="p-6 rounded-3xl bg-white border border-[#EDE5DB] shadow-xs space-y-4"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#E8654A]" />
          <h3 className="text-sm font-semibold text-[#2B231D]">Security & Account Settings</h3>
        </div>

        <AnimatePresence>
          {profileMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`p-3 rounded-xl text-xs leading-relaxed ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-600 border border-rose-200'
              }`}
            >
              {profileMsg.text}
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <label className="block text-xs font-medium text-[#5C4D3C] mb-1">
            Display Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD2C4] bg-[#FAF8F5] text-xs outline-none focus:border-[#E8654A]"
          />
        </div>

        <div className="pt-2 border-t border-[#F5F0EA]">
          <p className="text-[11px] font-mono text-[#A89682] uppercase mb-2">Change Password (Optional)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#8A7968] mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full px-3.5 py-2 rounded-xl border border-[#DDD2C4] bg-[#FAF8F5] text-xs outline-none focus:border-[#E8654A]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#8A7968] mb-1">New Password (Min 6 chars)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full px-3.5 py-2 rounded-xl border border-[#DDD2C4] bg-[#FAF8F5] text-xs outline-none focus:border-[#E8654A]"
              />
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01, y: -0.5 }}
          whileTap={{ scale: 0.98, y: 0 }}
          transition={{ duration: 0.15 }}
          type="submit"
          disabled={saving}
          className="py-2.5 px-5 rounded-xl bg-[#2B231D] text-white text-xs font-semibold hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-2xs"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Update Settings</span>}
        </motion.button>
      </motion.form>

      {/* Data Export Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="p-5 rounded-3xl bg-white border border-[#EDE5DB] shadow-xs flex items-center justify-between gap-4"
      >
        <div>
          <h3 className="text-sm font-semibold text-[#2B231D]">Export Your Travel Archive</h3>
          <p className="text-xs text-[#8A7968] mt-0.5">Download a JSON backup of your journeys and wishlist.</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15 }}
          onClick={exportTripsJSON}
          className="py-2.5 px-4 rounded-xl bg-[#FAF8F5] hover:bg-[#F5F0EA] border border-[#EDE5DB] text-xs font-semibold text-[#2B231D] flex items-center gap-2 transition-colors flex-shrink-0 cursor-pointer shadow-2xs"
        >
          {downloaded ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Downloaded</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-[#E8654A]" />
              <span>Export JSON</span>
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Standalone Installation Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-3xl bg-gradient-to-br from-[#EFE5DA] to-[#FAF8F5] border border-[#DDD2C4] shadow-xs flex items-start gap-4"
      >
        <div className="w-10 h-10 rounded-2xl bg-[#E8654A] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#2B231D]">Install as Native App (PWA)</h3>
          <p className="mt-1 text-xs text-[#6B5D4F] leading-relaxed">
            TripTrail supports standalone PWA mode. Tap your browser's <strong>"Share" → "Add to Home Screen"</strong> on mobile devices for full-screen offline experience.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
