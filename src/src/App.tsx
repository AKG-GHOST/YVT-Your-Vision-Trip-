import { useState, useEffect, useCallback } from 'react'
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
import AuthPage from './components/AuthPage'
import type { User, Trip, Tab, WishlistItem } from './types'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('triptrail_token')
    } catch {
      return null
    }
  })
  const [authLoading, setAuthLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [trips, setTrips] = useState<Trip[]>([])
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; checked: boolean; type?: string; file?: string }>({
    connected: false,
    checked: false,
  })

  // Helper for authenticated fetch
  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers || {})
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
        headers.set('Content-Type', 'application/json')
      }
      return fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      })
    },
    [token]
  )

  // Load user data (Trips & Wishlist)
  const loadUserData = useCallback(async () => {
    try {
      const [tripsRes, wishRes] = await Promise.all([
        authFetch('/api/trips'),
        authFetch('/api/wishlists'),
      ])

      if (tripsRes.ok) {
        const tripsData = await tripsRes.json()
        setTrips(Array.isArray(tripsData) ? tripsData : [])
      }

      if (wishRes.ok) {
        const wishData = await wishRes.json()
        setWishlist(Array.isArray(wishData) ? wishData : [])
      }
    } catch (err) {
      console.error('[Load User Data Error]', err)
    }
  }, [authFetch])

  // Check initial authentication state & DB status
  useEffect(() => {
    async function checkAuthAndDb() {
      setAuthLoading(true)

      // Check DB Status
      try {
        const statusRes = await fetch('/api/status')
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          setDbStatus({
            connected: Boolean(statusData.connected),
            checked: true,
            type: statusData.db?.type,
            file: statusData.db?.file,
          })
        }
      } catch {
        setDbStatus({ connected: false, checked: true })
      }

      // Check session
      try {
        const headers: HeadersInit = {}
        const savedToken = localStorage.getItem('triptrail_token')
        if (savedToken) {
          headers['Authorization'] = `Bearer ${savedToken}`
        }

        const meRes = await fetch('/api/auth/me', {
          headers,
          credentials: 'include',
        })

        if (meRes.ok) {
          const meData = await meRes.json()
          setUser(meData.user)
          if (savedToken) setToken(savedToken)
        } else {
          // Token expired or invalid
          setUser(null)
          setToken(null)
          localStorage.removeItem('triptrail_token')
        }
      } catch {
        setUser(null)
        setToken(null)
      } finally {
        setAuthLoading(false)
      }
    }

    checkAuthAndDb()
  }, [])

  // Load user-specific data once authenticated
  useEffect(() => {
    if (user && token) {
      loadUserData()
    } else {
      setTrips([])
      setWishlist([])
    }
  }, [user, token, loadUserData])

  // Handle successful login or register
  function handleAuthSuccess(authenticatedUser: User, receivedToken: string) {
    try {
      localStorage.setItem('triptrail_token', receivedToken)
    } catch {
      // ignore
    }
    setToken(receivedToken)
    setUser(authenticatedUser)
  }

  // Handle Logout
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem('triptrail_token')
    } catch {
      // ignore
    }
    setToken(null)
    setUser(null)
    setTrips([])
    setWishlist([])
    setActiveTab('home')
  }

  // Save new trip to backend
  async function handleSaveTrip(newTrip: Trip) {
    try {
      const res = await authFetch('/api/trips', {
        method: 'POST',
        body: JSON.stringify(newTrip),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save journey.')
      }
      const saved = await res.json()
      setTrips((prev) => [saved, ...prev])
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save trip.')
    }
  }

  // Delete trip from backend
  async function handleDeleteTrip(id: number) {
    try {
      const res = await authFetch(`/api/trips/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete journey.')
      }
      setTrips((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete trip.')
    }
  }

  // Add Wishlist item to backend
  async function handleAddWishlist(item: { title: string; location: string; season: string; vibe: string }) {
    const res = await authFetch('/api/wishlists', {
      method: 'POST',
      body: JSON.stringify(item),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to save wishlist destination.')
    }
    const saved = await res.json()
    setWishlist((prev) => [saved, ...prev])
  }

  // Remove Wishlist item from backend
  async function handleRemoveWishlist(id: string | number) {
    const res = await authFetch(`/api/wishlists/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Failed to remove wishlist item.')
    }
    setWishlist((prev) => prev.filter((w) => w.id !== id))
  }

  // Update profile / password
  async function handleUpdateProfile(name: string, currentPassword?: string, newPassword?: string) {
    const res = await authFetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, currentPassword, newPassword }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Profile update failed.')
    }
    if (data.user) {
      setUser(data.user)
    }
  }

  // Check DB ping
  async function handleCheckDb() {
    try {
      const res = await fetch('/api/status')
      const data = await res.json()
      setDbStatus({
        connected: Boolean(data.connected),
        checked: true,
        type: data.db?.type,
        file: data.db?.file,
      })
    } catch {
      setDbStatus({ connected: false, checked: true })
    }
  }

  function scrollToRoutePlanner() {
    setActiveTab('home')
    setTimeout(() => {
      document.getElementById('route-planner')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // Initial Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center text-[#2B231D]">
        <div className="w-8 h-8 rounded-full border-2 border-[#E8654A] border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-mono tracking-widest text-[#8A7968] uppercase">Loading TripTrail...</p>
      </div>
    )
  }

  // If not authenticated: show Login & Registration Page
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />
  }

  // Authenticated Application
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2B231D] selection:bg-[#E8654A] selection:text-white">
      {/* Top Header */}
      <Header
        user={user}
        dbStatus={dbStatus}
        showSearch={showSearch}
        onOpenSearch={() => setShowSearch(!showSearch)}
        onLogout={handleLogout}
        onOpenProfile={() => setActiveTab('profile')}
      />

      {/* Global Search Input Drawer */}
      {showSearch && (
        <div className="px-4 sm:px-6 py-3 bg-[#F5F0EA] border-b border-[#EDE5DB] max-w-2xl mx-auto">
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your journeys by city, title, or reflections..."
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
              user={user}
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
              onCaptureTrip={() => setDialogOpen(true)}
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
              onCaptureTrip={() => setDialogOpen(true)}
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
            user={user}
            dbStatus={dbStatus}
            onCheckDb={handleCheckDb}
            trips={trips}
            wishlist={wishlist}
            onLogout={handleLogout}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </main>

      {/* Sticky Bottom Navigation */}
      <BottomNav
        active={activeTab}
        onTab={(tab: Tab) => {
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
