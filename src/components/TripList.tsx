import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, ArrowUpRight, Compass, Plus } from 'lucide-react'
import type { Trip } from '../types'
import { formatDate, moodConfig } from '../data'

type Props = {
  trips: Trip[]
  onSelectTrip: (trip: Trip) => void
  onCaptureTrip?: () => void
  searchQuery: string
}

const MOOD_FILTERS: { id: string; label: string; icon?: string }[] = [
  { id: 'all', label: 'All Vibe' },
  { id: 'sunny', label: 'Sunny', icon: '☀️' },
  { id: 'mist', label: 'Misty', icon: '☁️' },
  { id: 'electric', label: 'Electric', icon: '⚡' },
  { id: 'slow', label: 'Slow', icon: '🌿' },
]

export default function TripList({ trips, onSelectTrip, onCaptureTrip, searchQuery }: Props) {
  const [activeMood, setActiveMood] = useState('all')

  const filteredTrips = trips.filter((trip) => {
    const matchesMood = activeMood === 'all' || trip.mood === activeMood
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      trip.title.toLowerCase().includes(q) ||
      trip.location.toLowerCase().includes(q) ||
      trip.note.toLowerCase().includes(q)
    return matchesMood && matchesSearch
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="mt-8 px-4 sm:px-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-[1.3px] text-[#A89682] uppercase">
            <span>PERSONAL ARCHIVE</span>
            <span>·</span>
            <span>{filteredTrips.length} {filteredTrips.length === 1 ? 'JOURNEY' : 'JOURNEYS'}</span>
          </div>
          <h2 className="mt-1 text-2xl font-serif font-bold tracking-tight text-[#2B231D]">
            Recorded Journeys
          </h2>
        </div>

        {/* Mood filter pills */}
        {trips.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
            {MOOD_FILTERS.map((filter) => {
              const isActive = activeMood === filter.id
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveMood(filter.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#2B231D] text-white shadow-2xs'
                      : 'bg-[#EDE5DB]/70 text-[#6B5D4F] hover:bg-[#E2D7CB]'
                  }`}
                >
                  {filter.icon && <span className="mr-1">{filter.icon}</span>}
                  <span>{filter.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Trips Grid or Empty State */}
      {trips.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#DDD2C4] p-8 sm:p-12 text-center bg-white/60">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#FAF8F5] border border-[#EDE5DB] flex items-center justify-center text-[#E8654A] mb-3 shadow-2xs">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="text-base font-serif font-bold text-[#2B231D]">Your Travel Journal is Empty</h3>
          <p className="text-xs text-[#8A7968] mt-1.5 max-w-sm mx-auto leading-relaxed">
            Every memorable voyage begins with a single moment. Capture your first journey, add notes, and save memories securely to your account.
          </p>
          {onCaptureTrip && (
            <button
              onClick={onCaptureTrip}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#2B231D] text-white text-xs font-semibold hover:bg-black transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4 text-[#E8654A]" />
              <span>Capture Your First Trip</span>
            </button>
          )}
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DDD2C4] p-8 text-center bg-white/50">
          <p className="text-sm font-serif text-[#6B5D4F]">No journeys match this filter.</p>
          <p className="text-xs text-[#A89682] mt-1">Try clearing your search query or choosing another vibe.</p>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {filteredTrips.map((trip, index) => {
            const mood = moodConfig[trip.mood] || moodConfig.sunny
            return (
              <motion.article
                key={trip.id || index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onSelectTrip(trip)}
                className="group relative flex min-h-[148px] rounded-2xl border border-[#EDE5DB] bg-white overflow-hidden hover:shadow-md hover:border-[#D8C7B5] transition-all cursor-pointer"
              >
                {/* Art Thumbnail Panel */}
                <div
                  className={`relative w-[110px] flex-shrink-0 flex flex-col justify-between p-3.5 ${mood.artBg} overflow-hidden select-none`}
                >
                  <div className={`absolute w-[115px] h-[115px] -right-10 -bottom-12 rounded-full ${mood.artCircle}`} />
                  <span className="relative z-10 text-3xl leading-none drop-shadow-2xs">{mood.icon}</span>
                  <span className="relative z-10 text-[10px] font-mono text-white font-semibold">
                    № {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Information Panel */}
                <div className="min-w-0 flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#2B231D] group-hover:text-[#E8654A] transition-colors truncate">
                        {trip.title}
                      </h3>
                      <ArrowUpRight className="w-4 h-4 text-[#C4B5A3] group-hover:text-[#E8654A] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
                    </div>

                    <p className="flex items-center gap-1.5 text-xs text-[#8A7968] mt-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#E8654A] flex-shrink-0" />
                      <span className="truncate">{trip.location}</span>
                    </p>

                    <p className="mt-2.5 text-xs leading-relaxed text-[#6B5D4F] font-serif line-clamp-2 italic">
                      "{trip.note || 'No reflections added yet.'}"
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#F5F0EA] flex items-center justify-between text-[10px] font-mono text-[#A89682]">
                    <span>
                      {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                    </span>
                    <span className="capitalize text-[#8A7968] font-medium">
                      {trip.mood}
                    </span>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
