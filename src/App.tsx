import { useState, useEffect } from 'react'
import Header from './components/Header'
import HeroBanner from './components/HeroBanner'
import RoutePlannerCard from './components/RoutePlannerCard'
import TripList from './components/TripList'
import InspirationBand from './components/InspirationBand'
import BottomNav from './components/BottomNav'
import TripDialog from './components/TripDialog'
import TripDetailModal from './components/TripDetailModal'
import WishlistView from './components/WishlistView'
import ProfileView from './components/ProfileView'
import { demoTrips, demoWishlist } from './data'
import type { Trip, Tab, WishlistItem } from './types'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [trips, setTrips] = useState<Trip[]>(() => {
    try {
      const saved = localStorage.getItem('triptrail_trips')
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return demoTrips
  })

  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    try {
      const saved = localStorage.getItem('triptrail_wishlist')
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    return demoWishlist
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; checked: boolean; version?: string }>({
    connected: false,
    checked: false,
  })

  // Synchronize with API on initial mount
  useEffect(() => {
    async function init() {
      // Check database status
      try {
        const statusRes = await fetch('/api/status')
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          setDbStatus({
            connected: Boolean(statusData.connected),
            checked: true,
            version: statusData.version,
          })
        }
      } catch {
        setDbStatus({ connected: false, checked: true })
      }

      // Fetch live trips if available
      try {
        const tripsRes = await fetch('/api/trips')
        if (tripsRes.ok) {
          const tripsData = await tripsRes.json()
          if (Array.isArray(tripsData) && tripsData.length > 0) {
            setTrips(tripsData)
          }
        }
      } catch {
        // use local storage trips
      }
    }
    init()
  }, [])

  // Save to localStorage whenever trips change
  useEffect(() => {
    try {
      localStorage.setItem('triptrail_trips', JSON.stringify(trips))
    } catch {
      // ignore
    }
  }, [trips])

  // Save wishlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('triptrail_wishlist', JSON.stringify(wishlist))
    } catch {
      // ignore
    }
  }, [wishlist])

  // Save a new trip
  async function handleSaveTrip(newTrip: Trip) {
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTrip),
      })
      if (res.ok) {
        const saved = await res.json()
        setTrips((prev) => [saved, ...prev])
        return
      }
    } catch {
      // fallback local
    }
    const localTrip: Trip = { ...newTrip, id: Date.now() }
    setTrips((prev) => [localTrip, ...prev])
  }

  // Delete a trip
  async function handleDeleteTrip(id: number) {
    try {
      await fetch(`/api/trips/${id}`, { method: 'DELETE' })
    } catch {
      // ignore
    }
    setTrips((prev) => prev.filter((t) => t.id !== id))
  }

  // Test Ping DB
  async function handleCheckDb() {
    try {
      const res = await fetch('/api/status')
      const data = await res.json()
      setDbStatus({
        connected: Boolean(data.connected),
        checked: true,
        version: data.version,
      })
    } catch {
      setDbStatus({ connected: false, checked: true })
    }
  }

  // Reset demo data
  function handleResetDemo() {
    setTrips(demoTrips)
    setWishlist(demoWishlist)
  }

  // Wishlist handlers
  function handleAddWishlist(item: WishlistItem) {
    setWishlist((prev) => [item, ...prev])
  }

  function handleRemoveWishlist(id: string) {
    setWishlist((prev) => prev.filter((w) => w.id !== id))
  }

  function scrollToRoutePlanner() {
    setActiveTab('home')
    setTimeout(() => {
      document.getElementById('route-planner')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2B231D] selection:bg-[#E8654A] selection:text-white">
      {/* Top Header */}
      <Header
        dbStatus={dbStatus}
        showSearch={showSearch}
        onOpenSearch={() => setShowSearch(!showSearch)}
      />

      {/* Global Search Input Drawer */}
      {showSearch && (
        <div className="px-4 sm:px-6 py-3 bg-[#F5F0EA] border-b border-[#EDE5DB] max-w-2xl mx-auto">
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by city, title, or memories..."
            className="w-full px-4 py-2.5 rounded-xl border border-[#DDD2C4] bg-white text-xs outline-none focus:border-[#E8654A] shadow-2xs"
          />
        </div>
      )}

      {/* Main Tab Views */}
      <main className="max-w-2xl mx-auto pb-24">
        {activeTab === 'home' && (
          <div className="py-4 space-y-2">
            {/* Tinker-Inspired Hero Banner */}
            <HeroBanner
              tripCount={trips.length}
              onCapture={() => setDialogOpen(true)}
              onPlanRoute={scrollToRoutePlanner}
            />

            {/* AI Route Planner Card */}
            <RoutePlannerCard />

            {/* Recent Trips / Journal Archive */}
            <TripList
              trips={trips}
              onSelectTrip={(t) => setSelectedTrip(t)}
              onDeleteTrip={handleDeleteTrip}
              searchQuery={searchQuery}
            />

            {/* Inspiration Band */}
            <InspirationBand />
          </div>
        )}

        {activeTab === 'journeys' && (
          <div className="py-4">
            <TripList
              trips={trips}
              onSelectTrip={(t) => setSelectedTrip(t)}
              onDeleteTrip={handleDeleteTrip}
              searchQuery={searchQuery}
            />
          </div>
        )}

        {activeTab === 'saved' && (
          <WishlistView
            items={wishlist}
            onAdd={handleAddWishlist}
            onRemove={handleRemoveWishlist}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            dbStatus={dbStatus}
            onCheckDb={handleCheckDb}
            trips={trips}
            onResetDemo={handleResetDemo}
          />
        )}
      </main>

      {/* Sticky Bottom Navigation */}
      <BottomNav
        active={activeTab}
        onTab={(tab) => {
          setActiveTab(tab)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        onCapture={() => setDialogOpen(true)}
      />

      {/* Modals */}
      <TripDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveTrip}
      />

      <TripDetailModal
        trip={selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onDelete={handleDeleteTrip}
      />
    </div>
  )
}
