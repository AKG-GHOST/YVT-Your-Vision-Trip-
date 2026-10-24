import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'

export default function InspirationBand() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="mx-6 mt-8 mb-4 min-h-[128px] rounded-xl bg-gradient-to-br from-sand-200 to-sand-100 p-5 flex items-center gap-5 relative overflow-hidden"
    >
      {/* Decorative circles */}
      <div className="absolute w-[180px] h-[180px] -right-16 -bottom-24 rounded-full border border-sand-300/40 shadow-[0_0_0_17px_transparent,0_0_0_18px_rgba(196,181,163,0.2)]" />

      <div className="text-sand-500 text-4xl flex-shrink-0">✺</div>
      <div>
        <p className="text-[10px] font-mono tracking-[1.3px] text-sand-400 uppercase">A Small Reminder</p>
        <h2 className="mt-2 text-xl font-serif font-medium text-sand-700 leading-tight">
          Make room<br />for wonder.
        </h2>
      </div>
      <ArrowUpRight className="ml-auto self-start text-sand-400 w-5 h-5 flex-shrink-0 relative z-10" />
    </motion.section>
  )
}
