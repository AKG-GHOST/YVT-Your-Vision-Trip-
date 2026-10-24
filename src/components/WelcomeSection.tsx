import { motion } from 'framer-motion'
import { formatFullDate } from '../data'

export default function WelcomeSection() {
  const today = formatFullDate(new Date()).toUpperCase()

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="px-6 pt-10 pb-6"
    >
      <p className="text-[10px] font-mono tracking-[1.5px] text-sand-400 uppercase">{today}</p>
      <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight text-sand-900">
        Where have you
        <br />
        <em className="font-serif font-medium text-coral not-italic">been lately?</em>
      </h1>
      <p className="mt-3 text-xs leading-relaxed text-sand-400 max-w-[270px]">
        Keep the little details. They become the best stories.
      </p>
    </motion.section>
  )
}
