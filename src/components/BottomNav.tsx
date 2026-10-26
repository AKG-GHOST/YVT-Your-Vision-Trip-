import { motion } from 'framer-motion'
import { Home, Compass, Bookmark, User, Plus } from 'lucide-react'
import type { Tab } from '../types'

type Props = {
  active: Tab
  onTab: (tab: Tab) => void
  onCapture: () => void
}

export default function BottomNav({ active, onTab, onCapture }: Props) {
  const leftTabs: { id: Tab; icon: typeof Home; label: string }[] = [
    { id: 'home', icon: Home, label: 'Curate' },
    { id: 'journeys', icon: Compass, label: 'Journeys' },
  ]

  const rightTabs: { id: Tab; icon: typeof Bookmark; label: string }[] = [
    { id: 'saved', icon: Bookmark, label: 'Wishlist' },
    { id: 'profile', icon: User, label: 'Profile' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-lg border-t border-[#EDE5DB] shadow-lg max-w-2xl mx-auto sm:rounded-t-3xl">
      <div className="flex items-center justify-around px-4 py-2 sm:py-2.5">
        {/* Left Tabs */}
        {leftTabs.map(({ id, icon: Icon, label }) => {
          const isActive = active === id
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.92 }}
              onClick={() => onTab(id)}
              className={`relative flex flex-col items-center gap-0.5 py-1 px-3 transition-colors cursor-pointer ${
                isActive ? 'text-[#E8654A]' : 'text-[#8A7968] hover:text-[#5C4D3C]'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="activeTabPill"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="absolute inset-0 rounded-xl bg-[#E8654A]/8 -z-10"
                />
              )}
              <Icon className="w-5 h-5 transition-transform duration-200" />
              <span className="text-[10px] font-medium tracking-tight">{label}</span>
              {isActive && (
                <motion.span
                  layoutId="activeTabDot"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="w-1 h-1 rounded-full bg-[#E8654A]"
                />
              )}
            </motion.button>
          )
        })}

        {/* Central Capture Button */}
        <motion.button
          whileHover={{ scale: 1.06, y: -2 }}
          whileTap={{ scale: 0.94, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={onCapture}
          className="group relative -top-4 w-12 h-12 rounded-full bg-[#E8654A] hover:bg-[#D75438] text-white flex items-center justify-center shadow-lg shadow-[#E8654A]/35 transition-shadow border-4 border-[#FAF8F5] cursor-pointer"
          aria-label="New Journal Entry"
        >
          <Plus className="w-5 h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-300" />
        </motion.button>

        {/* Right Tabs */}
        {rightTabs.map(({ id, icon: Icon, label }) => {
          const isActive = active === id
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.92 }}
              onClick={() => onTab(id)}
              className={`relative flex flex-col items-center gap-0.5 py-1 px-3 transition-colors cursor-pointer ${
                isActive ? 'text-[#E8654A]' : 'text-[#8A7968] hover:text-[#5C4D3C]'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="activeTabPill"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="absolute inset-0 rounded-xl bg-[#E8654A]/8 -z-10"
                />
              )}
              <Icon className="w-5 h-5 transition-transform duration-200" />
              <span className="text-[10px] font-medium tracking-tight">{label}</span>
              {isActive && (
                <motion.span
                  layoutId="activeTabDot"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="w-1 h-1 rounded-full bg-[#E8654A]"
                />
              )}
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}
