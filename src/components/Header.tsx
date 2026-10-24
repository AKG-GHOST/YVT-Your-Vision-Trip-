import { motion } from 'framer-motion'
import { Search } from 'lucide-react'

type Props = {
  dbStatus: { connected: boolean; checked: boolean }
  onOpenSearch: () => void
  showSearch: boolean
}

export default function Header({ dbStatus, onOpenSearch, showSearch }: Props) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md px-4 sm:px-6 py-4 border-b border-[#EDE5DB]/60 flex items-center justify-between"
    >
      {/* Brand logo in Tinker style (spaced out uppercase typography) */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#E8654A]" />
        <span className="text-xs sm:text-sm font-semibold tracking-[0.32em] text-[#2B231D] uppercase select-none">
          T I N K E R <span className="text-[#A89682] font-light">·</span> T R A I L
        </span>
      </div>

      {/* Right icons: DB Status & Search */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* DB / Cloud Status Indicator */}
        <div 
          title={dbStatus.connected ? "Connected to PostgreSQL" : "Running in Local Offline Mode"}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EDE5DB]/60 text-[10px] font-mono text-[#6B5D4F]"
        >
          {dbStatus.connected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="hidden xs:inline">POSTGRES</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="hidden xs:inline">LOCAL</span>
            </>
          )}
        </div>

        {/* Search button */}
        <button
          onClick={onOpenSearch}
          className={`p-2 rounded-full transition-colors ${
            showSearch ? 'bg-[#2B231D] text-white' : 'text-[#6B5D4F] hover:bg-[#EDE5DB]'
          }`}
          aria-label="Toggle search"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>
    </motion.header>
  )
}
