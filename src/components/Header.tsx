import { motion } from 'framer-motion'
import { Search, LogOut } from 'lucide-react'
import type { User } from '../types'

type Props = {
  user: User | null
  onOpenSearch: () => void
  showSearch: boolean
  onLogout: () => void
  onOpenProfile: () => void
}

export default function Header({
  user,
  onOpenSearch,
  showSearch,
  onLogout,
  onOpenProfile,
}: Props) {
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'T'

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md px-4 sm:px-6 py-3.5 border-b border-[#EDE5DB]/60 flex items-center justify-between"
    >
      {/* Brand logo in Tinker style */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#E8654A]" />
        <span className="text-xs sm:text-sm font-semibold tracking-[0.32em] text-[#2B231D] uppercase select-none">
          T I N K E R <span className="text-[#A89682] font-light">·</span> T R A I L
        </span>
      </div>

      {/* Right User Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
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

        {/* User Avatar & Profile Quick Trigger */}
        {user && (
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full bg-white border border-[#EDE5DB] hover:border-[#D8C7B5] transition-all"
            title={`Signed in as ${user.name} (${user.email})`}
          >
            <div className="w-6 h-6 rounded-full bg-[#2B231D] text-white text-[11px] font-semibold flex items-center justify-center">
              {initial}
            </div>
            <span className="text-xs font-medium text-[#2B231D] max-w-[80px] sm:max-w-[120px] truncate">
              {user.name.split(' ')[0]}
            </span>
          </button>
        )}

        {/* Logout Quick Button */}
        {user && (
          <button
            onClick={onLogout}
            className="p-2 rounded-full text-[#A89682] hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.header>
  )
}
