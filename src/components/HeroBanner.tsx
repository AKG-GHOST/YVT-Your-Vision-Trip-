import { motion } from 'framer-motion'
import { Sparkles, Compass, Plus, ArrowRight } from 'lucide-react'

type Props = {
  onCapture: () => void
  onPlanRoute: () => void
  tripCount: number
}

export default function HeroBanner({ onCapture, onPlanRoute, tripCount }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative mx-4 sm:mx-6 overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm border border-[#E3D9CD]"
    >
      {/* Background with Tinker-inspired diagonal split warm sand tones */}
      <div className="relative min-h-[340px] sm:min-h-[380px] p-6 sm:p-9 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#EFE5DA] via-[#E4D5C5] to-[#D5C2B0]">
        
        {/* Subtle diagonal split line effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background: 'linear-gradient(135deg, transparent 48%, rgba(200, 180, 160, 0.5) 49%, rgba(185, 165, 145, 0.3) 52%, transparent 54%)'
          }}
        />

        {/* Minimalist Graphic Elements mimicking the Ceramic Vase and Watch aesthetic */}
        <div className="absolute right-4 sm:right-10 top-6 sm:top-8 pointer-events-none select-none flex items-center gap-3">
          {/* Speckled Ceramic Vase Silhouette */}
          <div className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-[50%_50%_45%_45%] bg-[#F7F4EE] shadow-md border border-[#E8E2D6] overflow-hidden flex flex-col items-center pt-2">
            <div className="w-6 h-3 rounded-full bg-[#3D332A] opacity-70 mb-1" />
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#5C4D3C_1px,transparent_1px)] [background-size:6px_6px]" />
          </div>

          {/* Minimalist Classic Watch/Compass Timepiece Graphic */}
          <div className="relative -ml-2 mt-8 sm:mt-12 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#FFFFFF] shadow-lg border-2 border-[#D8C7B5] flex items-center justify-center">
            {/* Watch strap */}
            <div className="absolute -top-6 w-7 h-8 bg-[#2A2623] rounded-t-sm shadow-sm" />
            <div className="absolute -bottom-6 w-7 h-8 bg-[#2A2623] rounded-b-sm shadow-sm" />
            {/* Watch Face ticks */}
            <div className="relative w-full h-full rounded-full flex items-center justify-center p-2">
              <div className="absolute top-1.5 w-0.5 h-1.5 bg-[#2A2623]" />
              <div className="absolute bottom-1.5 w-0.5 h-1.5 bg-[#2A2623]" />
              <div className="absolute left-1.5 w-1.5 h-0.5 bg-[#2A2623]" />
              <div className="absolute right-1.5 w-1.5 h-0.5 bg-[#2A2623]" />
              {/* Hands */}
              <div className="w-0.5 h-6 bg-[#2A2623] -rotate-45 origin-bottom translate-y-[-50%]" />
              <div className="w-0.5 h-7 bg-[#E8654A] rotate-70 origin-bottom translate-y-[-50%]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#E8654A]" />
            </div>
          </div>
        </div>

        {/* Vertical Pagination Dots on Right Edge (exact detail from Tinker reference) */}
        <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#8E7E70] opacity-60" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#8E7E70] opacity-40" />
        </div>

        {/* Top Tag */}
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 backdrop-blur-md text-[10px] font-mono tracking-widest text-[#5C4C3E] uppercase shadow-xs border border-white/50">
            <Sparkles className="w-3 h-3 text-[#E8654A]" /> Issue Nº 01 · 2026
          </span>
        </div>

        {/* Headline & Editorial Copy */}
        <div className="relative z-10 max-w-[280px] sm:max-w-sm mt-8 sm:mt-12">
          <h1 className="text-3xl sm:text-4xl font-serif tracking-tight text-[#2B231D] leading-[1.12]">
            Back to the <br />
            <span className="italic font-normal text-[#E8654A]">Wonder</span>
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-[#6C5D4F] leading-relaxed font-sans font-light">
            Curate the miles, the quiet morning light, and every spontaneous detour.
          </p>
        </div>

        {/* Action Buttons with Frosted Glass look (just like the "Build Yours" pill) */}
        <div className="relative z-10 mt-6 sm:mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={onCapture}
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/80 hover:bg-white text-[#2B231D] text-xs font-semibold backdrop-blur-md shadow-sm border border-white/70 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-[#E8654A]" />
            <span>Capture Journey</span>
            <ArrowRight className="w-3 h-3 text-[#8A7968] group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={onPlanRoute}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#2B231D]/10 hover:bg-[#2B231D]/20 text-[#2B231D] text-xs font-medium backdrop-blur-sm transition-all"
          >
            <Compass className="w-3.5 h-3.5 text-[#2D7DD2]" />
            <span>Plan Route</span>
          </button>
        </div>

        {/* Bottom micro stats pill */}
        <div className="relative z-10 mt-5 pt-4 border-t border-[#D9C8B6]/60 flex items-center justify-between text-[10px] font-mono text-[#7A6A5B]">
          <span>{tripCount} JOURNEYS RECORDED</span>
          <span className="flex items-center gap-1.5 text-[#2E7D32]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-pulse" />
            READY OFFLINE
          </span>
        </div>

      </div>
    </motion.div>
  )
}
