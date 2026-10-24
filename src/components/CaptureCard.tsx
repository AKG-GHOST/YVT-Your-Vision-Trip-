import { motion } from 'framer-motion'
import { Plus, ArrowRight } from 'lucide-react'

type Props = { onOpen: () => void }

export default function CaptureCard({ onOpen }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mx-6 flex items-center justify-between rounded-xl bg-lime/10 border border-lime/20 p-5"
    >
      <div className="flex items-center gap-3.5">
        <div className="grid place-items-center w-9 h-9 rounded-full bg-lime/20 text-lime-dark">
          <Plus className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-sand-800">Capture a moment</h2>
          <p className="text-[10px] text-lime-dark/60 mt-0.5">Start a new trip journal</p>
        </div>
      </div>
      <button
        onClick={onOpen}
        className="w-9 h-9 grid place-items-center rounded-full bg-lime text-sand-900 hover:scale-105 active:scale-95 transition-transform"
        aria-label="Start a new trip"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.section>
  )
}
