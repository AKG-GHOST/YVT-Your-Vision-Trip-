import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MapPin, Compass, Trash2, Calendar, Bookmark, Loader2 } from 'lucide-react'
import type { WishlistItem } from '../types'

type Props = {
  items: WishlistItem[]
  onAdd: (item: { title: string; location: string; season: string; vibe: string }) => Promise<void>
  onRemove: (id: string | number) => Promise<void>
}

export default function WishlistView({ items, onAdd, onRemove }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [season, setSeason] = useState('')
  const [vibe, setVibe] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !location.trim()) return

    setSubmitting(true)
    try {
      await onAdd({
        title: title.trim(),
        location: location.trim(),
        season: season.trim() || 'Anytime',
        vibe: vibe.trim() || 'Spontaneous',
      })
      setTitle('')
      setLocation('')
      setSeason('')
      setVibe('')
      setShowAdd(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6 pb-24 max-w-2xl mx-auto">
      {/* View Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-[#A89682] uppercase">
            FUTURE ITINERARIES
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2B231D] mt-1">
            Travel Wishlist
          </h1>
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#2B231D] text-white text-xs font-medium hover:bg-black transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-[#E8654A]" />
          <span>{showAdd ? 'Cancel' : 'Add Destination'}</span>
        </button>
      </div>

      {/* Add Form Accordion */}
      <AnimatePresence>
        {showAdd && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit}
            className="mb-6 p-5 rounded-3xl bg-white border border-[#DDD2C4] shadow-xs space-y-3"
          >
            <h3 className="text-sm font-semibold text-[#2B231D]">Pin a Dream Destination</h3>
            <input
              type="text"
              required
              placeholder="Dream experience (e.g. Northern Lights under glass igloo)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DDD2C4] outline-none focus:border-[#E8654A]"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Location (e.g. Lapland, Finland)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DDD2C4] outline-none focus:border-[#E8654A]"
              />
              <input
                type="text"
                placeholder="Target Season (e.g. Winter / Dec)"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DDD2C4] outline-none focus:border-[#E8654A]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-[#E8654A] text-white text-xs font-semibold hover:bg-[#D75438] flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Save to Wishlist</span>}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Wishlist Items List or Empty State */}
      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#DDD2C4] p-8 sm:p-12 text-center bg-white/60">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#FAF8F5] border border-[#EDE5DB] flex items-center justify-center text-[#E8654A] mb-3 shadow-2xs">
            <Bookmark className="w-6 h-6" />
          </div>
          <h3 className="text-base font-serif font-bold text-[#2B231D]">No Wishlist Destinations Yet</h3>
          <p className="text-xs text-[#8A7968] mt-1.5 max-w-sm mx-auto leading-relaxed">
            Where in the world do you yearn to go next? Click "Add Destination" above to save dream escapes and upcoming road trips.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative p-4 rounded-2xl bg-white border border-[#EDE5DB] shadow-2xs flex flex-col justify-between hover:border-[#D8C7B5] transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FAF8F5] text-[10px] font-mono text-[#8A7968] border border-[#EDE5DB]">
                    <Compass className="w-2.5 h-2.5 text-[#2D7DD2]" />
                    <span>{item.vibe || 'Curated'}</span>
                  </span>

                  <button
                    onClick={() => onRemove(item.id)}
                    className="text-[#C4B5A3] hover:text-rose-500 transition-colors p-1"
                    aria-label="Remove wishlist item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="mt-2 text-sm font-semibold text-[#2B231D] leading-snug">
                  {item.title}
                </h3>

                <div className="mt-2 flex items-center gap-1.5 text-xs text-[#8A7968]">
                  <MapPin className="w-3.5 h-3.5 text-[#E8654A]" />
                  <span>{item.location}</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#F5F0EA] flex items-center gap-1.5 text-[10px] font-mono text-[#A89682]">
                <Calendar className="w-3 h-3 text-[#A89682]" />
                <span>Target Season: {item.season}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
