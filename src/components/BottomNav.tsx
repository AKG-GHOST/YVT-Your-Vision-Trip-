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
            <button
              key={id}
              onClick={() => onTab(id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
                isActive ? 'text-[#E8654A]' : 'text-[#8A7968] hover:text-[#5C4D3C]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-tight">{label}</span>
            </button>
          )
        })}

        {/* Central Capture Button */}
        <button
          onClick={onCapture}
          className="relative -top-4 w-12 h-12 rounded-full bg-[#E8654A] hover:bg-[#D75438] active:scale-95 text-white flex items-center justify-center shadow-lg shadow-[#E8654A]/35 transition-all border-4 border-[#FAF8F5]"
          aria-label="New Journal Entry"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Right Tabs */}
        {rightTabs.map(({ id, icon: Icon, label }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
                isActive ? 'text-[#E8654A]' : 'text-[#8A7968] hover:text-[#5C4D3C]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium tracking-tight">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
