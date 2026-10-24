import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Calendar, Trash2, Copy, Check, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import type { Trip } from '../types'
import { formatDate, moodConfig } from '../data'

type Props = {
  trip: Trip | null
  onClose: () => void
  onDelete: (id: number) => void
}

export default function TripDetailModal({ trip, onClose, onDelete }: Props) {
  const [copied, setCopied] = useState(false)

  if (!trip) return null

  const mood = moodConfig[trip.mood] || moodConfig.sunny

  function handleCopy() {
    if (!trip) return
    const text = `${trip.title}\n📍 ${trip.location} (${formatDate(trip.start_date)} - ${formatDate(trip.end_date)})\n\n${trip.note}`
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const mapsQuery = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.location)}`

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#FAF8F5] rounded-3xl overflow-hidden shadow-2xl border border-[#EDE5DB]"
        >
          {/* Header Banner with Mood Accent */}
          <div className={`relative h-36 ${mood.artBg} p-6 flex flex-col justify-between overflow-hidden`}>
            <div className={`absolute w-36 h-36 -right-8 -bottom-12 rounded-full ${mood.artCircle}`} />
            
            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md text-xs font-medium text-[#2B231D] shadow-xs">
                <span>{mood.icon}</span>
                <span className="capitalize">{mood.label} Journey</span>
              </span>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/15 hover:bg-black/25 text-white flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative z-10">
              <span className="text-3xl sm:text-4xl leading-none">{mood.icon}</span>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            <h2 className="text-2xl font-serif font-bold text-[#2B231D] leading-tight">
              {trip.title}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[#8A7968]">
              <div className="flex items-center gap-1.5 font-medium text-[#5C4D3C]">
                <MapPin className="w-4 h-4 text-[#E8654A]" />
                <span>{trip.location}</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-[#A89682]" />
                <span>{formatDate(trip.start_date)} — {formatDate(trip.end_date)}</span>
              </div>
            </div>

            {/* Note story */}
            <div className="mt-5 p-4 rounded-2xl bg-white border border-[#EDE5DB] shadow-2xs">
              <p className="text-xs font-mono text-[#A89682] uppercase tracking-wider mb-1.5">
                Journal Reflection
              </p>
              <p className="text-sm font-serif leading-relaxed text-[#4A3F35] whitespace-pre-line italic">
                "{trip.note || 'No notes added for this memory.'}"
              </p>
            </div>

            {/* Actions Bar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#EDE5DB]">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F5F0EA] border border-[#DDD2C4] text-xs font-medium text-[#4A3F35] transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Story</span>
                    </>
                  )}
                </button>

                <a
                  href={mapsQuery}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F5F0EA] border border-[#DDD2C4] text-xs font-medium text-[#2D7DD2] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Maps</span>
                </a>
              </div>

              {trip.id && (
                <button
                  onClick={() => {
                    if (window.confirm('Delete this trip memory from your journal?')) {
                      onDelete(trip.id!)
                      onClose()
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
