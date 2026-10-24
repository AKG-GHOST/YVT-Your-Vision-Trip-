import { useState } from 'react'
import { motion } from 'framer-motion'
import { Database, Download, RefreshCw, Smartphone, Check } from 'lucide-react'
import type { Trip } from '../types'

type Props = {
  dbStatus: { connected: boolean; checked: boolean; version?: string; error?: string }
  onCheckDb: () => void
  trips: Trip[]
  onResetDemo: () => void
}

export default function ProfileView({ dbStatus, onCheckDb, trips, onResetDemo }: Props) {
  const [downloaded, setDownloaded] = useState(false)
  const [checking, setChecking] = useState(false)

  async function handleCheck() {
    setChecking(true)
    await onCheckDb()
    setChecking(false)
  }

  function exportTripsJSON() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(trips, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `triptrail-backup-${new Date().toISOString().split('T')[0]}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2500)
  }

  return (
    <div className="px-4 sm:px-6 py-6 pb-24 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <span className="text-[10px] font-mono tracking-widest text-[#A89682] uppercase">
          SYSTEM & STORAGE
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2B231D] mt-1">
          Traveler Hub
        </h1>
      </div>

      {/* Database & Cloud State Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-3xl bg-white border border-[#EDE5DB] shadow-xs space-y-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              dbStatus.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#2B231D]">
                {dbStatus.connected ? 'PostgreSQL Live Connected' : 'Offline / Local Persistence'}
              </h3>
              <p className="text-xs text-[#8A7968]">
                {dbStatus.connected
                  ? 'Trips sync directly to your relational database'
                  : 'Running locally via browser & memory sync'}
              </p>
            </div>
          </div>

          <button
            onClick={handleCheck}
            disabled={checking}
            className="p-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F5F0EA] border border-[#EDE5DB] text-[#5C4D3C] text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>Test Ping</span>
          </button>
        </div>

        {dbStatus.version && (
          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EDE5DB] text-[11px] font-mono text-[#5C4D3C] truncate">
            {dbStatus.version}
          </div>
        )}

        {/* Database setup instructions toggle */}
        <div className="p-3 rounded-xl bg-[#F5F0EA]/60 border border-[#EDE5DB] text-xs text-[#6B5D4F] leading-relaxed">
          <span className="font-semibold text-[#2B231D]">Cloud Deployment Note:</span> To connect PostgreSQL, simply define <code className="px-1.5 py-0.5 rounded bg-white text-[11px] font-mono">DATABASE_URL=postgresql://...</code> in your environment variables.
        </div>
      </motion.div>

      {/* Data Management Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-3xl bg-white border border-[#EDE5DB] shadow-xs space-y-4"
      >
        <h3 className="text-sm font-semibold text-[#2B231D]">Data Management & Backup</h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={exportTripsJSON}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#FAF8F5] hover:bg-[#F5F0EA] border border-[#EDE5DB] text-xs font-semibold text-[#2B231D] flex items-center justify-center gap-2 transition-colors"
          >
            {downloaded ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Downloaded Backup!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-[#E8654A]" />
                <span>Export Journal as JSON</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (window.confirm('Reset journal with sample trips?')) {
                onResetDemo()
              }
            }}
            className="py-2.5 px-4 rounded-xl bg-[#FAF8F5] hover:bg-[#F5F0EA] border border-[#EDE5DB] text-xs font-medium text-[#8A7968] flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Restore Sample Trips</span>
          </button>
        </div>
      </motion.div>

      {/* PWA / Standalone Installation Card */}
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
            TripTrail includes full offline Service Worker caching and an app manifest. Tap your browser's <strong>"Share" → "Add to Home Screen"</strong> on iOS, or <strong>"Install App"</strong> on Chrome.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
