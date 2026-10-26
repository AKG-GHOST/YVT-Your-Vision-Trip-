import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Sparkles, Compass, Plus, ArrowRight } from 'lucide-react'
import type { User } from '../types'

type Props = {
  user: User | null
  onCapture: () => void
  onPlanRoute: () => void
  tripCount: number
}

export default function HeroBanner({ user, onCapture, onPlanRoute, tripCount }: Props) {
  const firstName = user?.name ? user.name.split(' ')[0] : 'Traveler'

  // Spring-based interactive subtle parallax responding to pointer movement
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springConfig = { damping: 30, stiffness: 100 }

  const watchParallaxX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-7, 7]), springConfig)
  const watchParallaxY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-5, 5]), springConfig)
  const vaseParallaxX = useSpring(useTransform(mouseX, [-0.5, 0.5], [5, -5]), springConfig)
  const vaseParallaxY = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), springConfig)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative mx-4 sm:mx-6 overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm border border-[#E3D9CD]"
    >
      {/* Background with Tinker-inspired diagonal split warm sand tones */}
      <div className="relative min-h-[340px] sm:min-h-[380px] p-6 sm:p-9 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#EFE5DA] via-[#E4D5C5] to-[#D5C2B0]">
        
        {/* Soft diagonal light sweep across the beige background */}
        <div 
          className="absolute -inset-[100%] pointer-events-none opacity-25 animate-light-sweep"
          style={{
            background: 'linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.5) 48%, rgba(255, 255, 255, 0.7) 50%, rgba(255, 255, 255, 0.5) 52%, transparent 60%)',
          }}
        />

        {/* Subtle diagonal split line effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background: 'linear-gradient(135deg, transparent 48%, rgba(200, 180, 160, 0.5) 49%, rgba(185, 165, 145, 0.3) 52%, transparent 54%)'
          }}
        />

        {/* Minimalist Graphic Elements mimicking Ceramic Vase and Watch */}
        <div className="absolute right-4 sm:right-10 top-6 sm:top-8 pointer-events-none select-none flex items-center gap-3">
          {/* Speckled Ceramic Vase Silhouette with gentle counter-float and parallax */}
          <motion.div
            style={{ x: vaseParallaxX, y: vaseParallaxY }}
            animate={{ y: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 7.5, ease: 'easeInOut' }}
            className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-[50%_50%_45%_45%] bg-[#F7F4EE] shadow-md border border-[#E8E2D6] overflow-hidden flex flex-col items-center pt-2"
          >
            <div className="w-6 h-3 rounded-full bg-[#3D332A] opacity-70 mb-1" />
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#5C4D3C_1px,transparent_1px)] [background-size:6px_6px]" />
          </motion.div>

          {/* Minimalist Classic Watch/Compass Timepiece Graphic with gentle float and parallax */}
          <motion.div
            style={{ x: watchParallaxX, y: watchParallaxY }}
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
            className="relative -ml-2 mt-8 sm:mt-12 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#FFFFFF] shadow-lg border-2 border-[#D8C7B5] flex items-center justify-center"
          >
            {/* Watch strap */}
            <div className="absolute -top-6 w-7 h-8 bg-[#2A2623] rounded-t-sm shadow-sm" />
            <div className="absolute -bottom-6 w-7 h-8 bg-[#2A2623] rounded-b-sm shadow-sm" />
            {/* Watch Face ticks */}
            <div className="relative w-full h-full rounded-full flex items-center justify-center p-2">
              <div className="absolute top-1.5 w-0.5 h-1.5 bg-[#2A2623]" />
              <div className="absolute bottom-1.5 w-0.5 h-1.5 bg-[#2A2623]" />
              <div className="absolute left-1.5 w-1.5 h-0.5 bg-[#2A2623]" />
              <div className="absolute right-1.5 w-1.5 h-0.5 bg-[#2A2623]" />
              {/* Hour hand */}
              <div className="w-0.5 h-6 bg-[#2A2623] -rotate-45 origin-bottom translate-y-[-50%]" />
              {/* Minute/Second hand with slow, calm rotation */}
              <motion.div
                animate={{ rotate: 430 }}
                initial={{ rotate: 70 }}
                transition={{ repeat: Infinity, duration: 60, ease: 'linear' }}
                className="absolute w-0.5 h-7 bg-[#E8654A] origin-bottom translate-y-[-50%]"
              />
              <div className="relative z-10 w-1.5 h-1.5 rounded-full bg-[#E8654A]" />
            </div>
          </motion.div>
        </div>

        {/* Vertical Pagination Dots on Right Edge with soft opacity transitions */}
        <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none">
          <motion.span
            animate={{ opacity: [1, 0.45, 1], scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full bg-white shadow-sm"
          />
          <motion.span
            animate={{ opacity: [0.45, 0.85, 0.45], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 4.5, delay: 1.5, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full bg-[#8E7E70]"
          />
          <motion.span
            animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 4.5, delay: 3, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full bg-[#8E7E70]"
          />
        </div>

        {/* Top Tag */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="relative z-10"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 backdrop-blur-md text-[10px] font-mono tracking-widest text-[#5C4C3E] uppercase shadow-xs border border-white/50">
            <Sparkles className="w-3 h-3 text-[#E8654A]" /> {firstName}'s Journal · 2026
          </span>
        </motion.div>

        {/* Headline & Editorial Copy with subtle fade-in and upward entrance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-[280px] sm:max-w-sm mt-8 sm:mt-12"
        >
          <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-[#2B231D] leading-[1.12]">
            Back to the <br />
            <span className="italic font-normal text-[#E8654A]">Wonder</span>
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-[#6C5D4F] leading-relaxed font-sans font-light">
            Curate the miles, the quiet morning light, and every spontaneous detour.
          </p>
        </motion.div>

        {/* Action Buttons with smooth hover transitions, tiny lift, and gentle press feedback */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mt-6 sm:mt-8 flex flex-wrap items-center gap-3"
        >
          <motion.button
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.97, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onCapture}
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 hover:bg-white text-[#2B231D] text-xs font-semibold backdrop-blur-md shadow-sm hover:shadow-md border border-white/70 transition-shadow cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#E8654A]" />
            <span>Capture Journey</span>
            <ArrowRight className="w-3 h-3 text-[#8A7968] group-hover:translate-x-1 transition-transform duration-200" />
          </motion.button>

          <motion.button
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.97, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onPlanRoute}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#2B231D]/10 hover:bg-[#2B231D]/15 text-[#2B231D] text-xs font-medium backdrop-blur-sm transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#2D7DD2]" />
            <span>Plan Route</span>
          </motion.button>
        </motion.div>

        {/* Bottom micro stats pill */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative z-10 mt-5 pt-4 border-t border-[#D9C8B6]/60 flex items-center justify-between text-[10px] font-mono text-[#7A6A5B]"
        >
          <span>{tripCount} {tripCount === 1 ? 'JOURNEY RECORDED' : 'JOURNEYS RECORDED'}</span>
          <span className="flex items-center gap-1.5 text-[#2E7D32]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
            SYNCED TO ACCOUNT
          </span>
        </motion.div>

      </div>
    </motion.div>
  )
}
