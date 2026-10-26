import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, ExternalLink, Loader2, Navigation, MapPin } from 'lucide-react'
import type { RouteResult } from '../types'

const PRESET_ROUTES = [
  'Goa to Gokarna, with beach stops',
  'Bengaluru -> Mysuru -> Coorg coffee trail',
  'Mumbai to Lonavala then Mahabaleshwar',
  'Jaipur -> Jodhpur -> Udaipur heritage run',
]

export default function RoutePlannerCard() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RouteResult | null>(null)
  const [error, setError] = useState('')

  async function planRoute(targetPrompt?: string) {
    const textToPlan = (targetPrompt !== undefined ? targetPrompt : prompt).trim()
    if (!textToPlan) return

    setLoading(true)
    setError('')
    setResult(null)
    if (targetPrompt) setPrompt(targetPrompt)

    try {
      const res = await fetch('/api/ai/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToPlan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to plan route')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.section
      id="route-planner"
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-4 sm:mx-6 mt-6 rounded-2xl border border-[#DCE8EF] bg-gradient-to-b from-[#F2F8FC] to-[#FFFFFF] p-5 sm:p-6 shadow-xs overflow-hidden"
    >
      {/* Subtle moving accent on the card top border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none overflow-hidden opacity-75">
        <div 
          className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#2D7DD2]/50 to-transparent"
          style={{
            animation: 'light-sweep 9s ease-in-out infinite'
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ rotate: [0, 8, -6, 0] }}
              transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
              className="p-1 rounded-md bg-[#2D7DD2]/10 text-[#2D7DD2] inline-flex items-center justify-center"
            >
              <Navigation className="w-3.5 h-3.5" />
            </motion.span>
            <p className="text-[10px] font-mono tracking-[1.4px] text-[#648499] uppercase">
              AI Route Curator
            </p>
          </div>
          <h2 className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-[#233544]">
            Map your next voyage.
          </h2>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-[#E8F5D8] px-2.5 py-1 text-[10px] font-mono text-[#4D7E26] font-medium border border-[#D5EAC1]">
          <motion.span
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="inline-flex"
          >
            <Sparkles className="w-3 h-3 text-[#E8654A]" />
          </motion.span>
          <span>AI READY</span>
        </span>
      </div>

      <p className="mt-2 text-xs text-[#708999] leading-relaxed">
        Describe your dream itinerary and let the engine draft waypoints, mileage, and driving legs.
      </p>

      {/* Preset prompt pills with smooth hover and selection feedback */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESET_ROUTES.map((preset, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.96, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={() => planRoute(preset)}
            className={`text-[10px] font-sans px-2.5 py-1 rounded-full text-left transition-all cursor-pointer ${
              prompt === preset
                ? 'bg-[#2D7DD2] text-white shadow-2xs font-medium'
                : 'bg-[#E5EEF4] text-[#416277] hover:bg-[#D5E5F0]'
            }`}
          >
            {preset}
          </motion.button>
        ))}
      </div>

      {/* Input row */}
      <div className="mt-4 flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && planRoute()}
          placeholder="e.g. Ooty to Kodaikanal via scenic mist passes"
          className="flex-1 min-w-0 px-3.5 py-2.5 text-xs rounded-xl border border-[#CFDFEB] bg-white text-[#233544] placeholder:text-[#9FB7C6] outline-none focus:border-[#2D7DD2] focus:ring-2 focus:ring-[#2D7DD2]/10 transition-all shadow-2xs"
        />
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.96, y: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => planRoute()}
          disabled={loading}
          className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-[#2D7DD2] hover:bg-[#1A5FA8] text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm cursor-pointer"
          aria-label="Compute route"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Plan</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </motion.button>
      </div>

      {/* Route Result & Interactive Preview */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 pt-4 border-t border-[#DFEBF2] flex items-center gap-3.5"
          >
            <div className="w-9 h-9 grid place-items-center rounded-full bg-[#E8F5D8] text-[#4D7E26]">
              <Sparkles className="w-4 h-4 animate-spin text-[#E8654A]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#233544]">Curating itinerary rhythm...</p>
              <p className="text-[10px] text-[#708999] mt-0.5">Calculating waypoints, driving distance, and traffic line</p>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 pt-4 border-t border-[#DFEBF2] flex items-center gap-3"
          >
            <div className="w-9 h-9 grid place-items-center rounded-full bg-rose-100 text-rose-600 text-xs font-bold">!</div>
            <div>
              <p className="text-xs font-semibold text-rose-700">Route paused</p>
              <p className="text-[10px] text-rose-500 mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}

        {result && !loading && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 pt-4 border-t border-[#DFEBF2]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Visual Minimalist Route Map Graphic */}
                <div className="relative flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden bg-[#DCEEE0] border border-[#C5E1CA]">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#E3F2E7] to-[#CCE6D2]" />
                  {/* Waypoint connection roads */}
                  <div className="absolute w-16 h-1 bg-white border border-[#A6CDB0] rounded-full left-3 top-8 -rotate-25 origin-left" />
                  <div className="absolute w-12 h-1 bg-white border border-[#A6CDB0] rounded-full left-10 top-5 rotate-40 origin-left" />
                  {/* Pins */}
                  <div className="absolute w-2.5 h-2.5 rounded-full bg-[#2D7DD2] border-2 border-white left-3.5 top-7 shadow-xs" />
                  <div className="absolute w-2.5 h-2.5 rounded-full bg-[#8BC34A] border-2 border-white left-10 top-4 shadow-xs" />
                  <motion.div
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className="absolute w-2.5 h-2.5 rounded-full bg-[#E8654A] border-2 border-white right-3 bottom-3 shadow-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#233544]">{result.distance}</span>
                    <span className="text-[#A0B5C2]">·</span>
                    <span className="text-xs font-medium text-[#4D6779]">{result.duration}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#708999]">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{result.mode === 'demo' ? 'Sample coordinates' : 'Live Google Routes'}</span>
                  </div>
                </div>
              </div>

              {/* Action: Open in Google Maps */}
              <motion.a
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.18 }}
                href={result.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D7DD2]/10 hover:bg-[#2D7DD2]/20 text-[#2D7DD2] text-xs font-semibold transition-colors shadow-2xs"
              >
                <span>Navigate in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </motion.a>
            </div>

            {/* Waypoint badges list */}
            <div className="mt-3 pt-3 border-t border-[#DFEBF2]/60 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono text-[#829CAE] mr-1">WAYPOINTS:</span>
              {result.stops.map((stop, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-[#CFDFEB] text-[10px] font-medium text-[#2C4456]"
                >
                  <MapPin className="w-2.5 h-2.5 text-[#E8654A]" />
                  <span>{stop}</span>
                  {index < result.stops.length - 1 && (
                    <span className="text-[#9DB4C4] ml-1">→</span>
                  )}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {!loading && !error && !result && (
          <div className="mt-4 pt-4 border-t border-[#DFEBF2] flex items-center gap-3 text-[#708999]">
            <div className="w-9 h-9 grid place-items-center rounded-xl bg-[#E8F1F6] text-[#678A9F]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#3E5B6E]">Select a preset or type your custom itinerary</p>
              <p className="text-[10px] text-[#869EAE]">Extracts stops & plots complete driving directions</p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
