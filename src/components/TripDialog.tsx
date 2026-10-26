import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, MapPin } from 'lucide-react'
import type { Trip } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  onSave: (trip: Trip) => void
}

const MOODS: { id: Trip['mood']; label: string; icon: string; desc: string }[] = [
  { id: 'sunny', label: 'Sunny', icon: '☀️', desc: 'Warm, bright, carefree days' },
  { id: 'mist', label: 'Misty', icon: '☁️', desc: 'Foggy trails, tea gardens & rain' },
  { id: 'electric', label: 'Electric', icon: '⚡', desc: 'Neon city nights & street food' },
  { id: 'slow', label: 'Slow', icon: '🌿', desc: 'Quiet books, cafes & ocean tides' },
]

export default function TripDialog({ open, onClose, onSave }: Props) {
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [mood, setMood] = useState<Trip['mood']>('sunny')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !location.trim() || !startDate || !endDate) {
      setError('Please provide title, location, and valid dates.')
      return
    }

    onSave({
      title: title.trim(),
      location: location.trim(),
      start_date: startDate,
      end_date: endDate,
      note: note.trim(),
      mood,
    })

    // Reset
    setTitle('')
    setLocation('')
    setNote('')
    setError('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop with smooth fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg bg-[#FAF8F5] rounded-3xl overflow-hidden shadow-2xl border border-[#EDE5DB] my-8 z-10"
          >
            {/* Modal Top Header */}
        <div className="p-6 pb-4 border-b border-[#EDE5DB] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-[#A89682] uppercase">
              JOURNAL ENTRY
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2B231D] mt-0.5">
              Capture your trip
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#EDE5DB]/70 hover:bg-[#EDE5DB] text-[#6B5D4F] flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[#5C4D3C] mb-1.5">
              Trip Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dawn over the backwaters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD2C4] bg-white text-xs text-[#2B231D] placeholder:text-[#B8A896] outline-none focus:border-[#E8654A] focus:ring-2 focus:ring-[#E8654A]/10 transition-all"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-[#5C4D3C] mb-1.5">
              Where did you go?
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-[#E8654A] absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Region, or Country"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#DDD2C4] bg-white text-xs text-[#2B231D] placeholder:text-[#B8A896] outline-none focus:border-[#E8654A] focus:ring-2 focus:ring-[#E8654A]/10 transition-all"
              />
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#5C4D3C] mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#DDD2C4] bg-white text-xs text-[#2B231D] outline-none focus:border-[#E8654A] focus:ring-2 focus:ring-[#E8654A]/10 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5C4D3C] mb-1.5">
                End Date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#DDD2C4] bg-white text-xs text-[#2B231D] outline-none focus:border-[#E8654A] focus:ring-2 focus:ring-[#E8654A]/10 transition-all font-mono"
              />
            </div>
          </div>

          {/* Mood / Vibe selector pills */}
          <div>
            <label className="block text-xs font-medium text-[#5C4D3C] mb-2">
              How did it feel? (Vibe)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MOODS.map((m) => {
                const isSelected = mood === m.id
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setMood(m.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'border-[#2B231D] bg-white shadow-xs ring-1 ring-[#2B231D]'
                        : 'border-[#EDE5DB] bg-[#F5F0EA]/70 hover:bg-[#F5F0EA]'
                    }`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#2B231D]">{m.label}</p>
                      <p className="text-[10px] text-[#8A7968] truncate">{m.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reflection Story */}
          <div>
            <label className="block text-xs font-medium text-[#5C4D3C] mb-1.5">
              What stayed with you? (Reflection)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="The sound of waves at 6 AM, the scent of fresh cardamom, the quiet roadside temple..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD2C4] bg-white text-xs text-[#2B231D] placeholder:text-[#B8A896] outline-none focus:border-[#E8654A] focus:ring-2 focus:ring-[#E8654A]/10 transition-all font-serif resize-none"
            />
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <motion.button
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.98, y: 0 }}
              transition={{ duration: 0.18 }}
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#E8654A] hover:bg-[#D75438] text-white text-xs font-semibold shadow-md shadow-[#E8654A]/25 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Save this journey</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  )
}
