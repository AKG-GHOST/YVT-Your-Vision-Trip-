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

// Helper to safely parse JSON without crashing on HTML
async function safeJson<T = any>(res: Response): Promise<{ ok: boolean; data: T | null; error?: string }> {
  const text = await res.text()
  try {
    const data = text ? JSON.parse(text) : null
    return { ok: res.ok, data, error: data?.error }
  } catch {
    return {
      ok: false,
      data: null,
      error: res.ok ? 'Received invalid JSON' : `Server responded with ${res.status}: ${res.statusText}`,
    }
  }
}

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

  // Helper for authenticated fetch
  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers || {})
      if (token && token !== 'guest-token') {
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
    if (token === 'guest-token') {
      try {
        const localTrips = localStorage.getItem('triptrail_guest_trips')
        const localWish = localStorage.getItem('triptrail_guest_wishlist')
        setTrips(localTrips ? JSON.parse(localTrips) : [])
        setWishlist(localWish ? JSON.parse(localWish) : [])
      } catch {
        setTrips([])
        setWishlist([])
      }
      return
    }

    try {
      const [tripsRes, wishRes] = await Promise.all([
        authFetch('/api/trips'),
        authFetch('/api/wishlists'),
      ])

      const tripsParsed = await safeJson<Trip[]>(tripsRes)
      if (tripsParsed.ok && Array.isArray(tripsParsed.data)) {
        setTrips(tripsParsed.data)
      }

      const wishParsed = await safeJson<WishlistItem[]>(wishRes)
      if (wishParsed.ok && Array.isArray(wishParsed.data)) {
        setWishlist(wishParsed.data)
      }
    } catch (err) {
      console.error('[Load User Data Error]', err)
    }
  }, [authFetch, token])

  // Check initial authentication state
  useEffect(() => {
    async function checkAuthAndDb() {
      setAuthLoading(true)

      // Check saved guest mode
      const savedToken = localStorage.getItem('triptrail_token')
      if (savedToken === 'guest-token') {
        setUser({ id: 0, name: 'Guest Traveler', email: 'guest@offline.local' })
        setToken('guest-token')
        setAuthLoading(false)
        return
      }

      // Check session with server
      try {
        const headers: HeadersInit = {}
        if (savedToken) {
          headers['Authorization'] = `Bearer ${savedToken}`
        }

        const meRes = await fetch('/api/auth/me', {
          headers,
          credentials: 'include',
        })

        const meParsed = await safeJson<{ user: User }>(meRes)

        if (meParsed.ok && meParsed.data?.user) {
          setUser(meParsed.data.user)
          if (savedToken) setToken(savedToken)
        } else {
          setUser(null)
          setToken(null)
          if (savedToken && savedToken !== 'guest-token') {
            localStorage.removeItem('triptrail_token')
          }
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

  // Save guest trips to localStorage
  useEffect(() => {
    if (token === 'guest-token') {
      try {
        localStorage.setItem('triptrail_guest_trips', JSON.stringify(trips))
        localStorage.setItem('triptrail_guest_wishlist', JSON.stringify(wishlist))
      } catch {
        // ignore
      }
    }
  }, [trips, wishlist, token])

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

  // Handle Guest Access
  function handleGuestAccess() {
    const guestUser: User = { id: 0, name: 'Guest Explorer', email: 'guest@offline.local' }
    try {
      localStorage.setItem('triptrail_token', 'guest-token')
    } catch {
      // ignore
    }
    setToken('guest-token')
    setUser(guestUser)
  }

  // Handle Logout
  async function handleLogout() {
    if (token && token !== 'guest-token') {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      } catch {
        // ignore
      }
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

  // Save new trip to backend or guest storage
  async function handleSaveTrip(newTrip: Trip) {
    if (token === 'guest-token') {
      const localTrip: Trip = { ...newTrip, id: Date.now() }
      setTrips((prev) => [localTrip, ...prev])
      return
    }

    try {
      const res = await authFetch('/api/trips', {
        method: 'POST',
        body: JSON.stringify(newTrip),
      })
      const parsed = await safeJson<Trip>(res)
      if (!parsed.ok || !parsed.data) {
        throw new Error(parsed.error || 'Failed to save journey.')
      }
      setTrips((prev) => [parsed.data!, ...prev])
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save trip.')
    }
  }

  // Delete trip
  async function handleDeleteTrip(id: number) {
    if (token === 'guest-token') {
      setTrips((prev) => prev.filter((t) => t.id !== id))
      return
    }

    try {
      const res = await authFetch(`/api/trips/${id}`, { method: 'DELETE' })
      const parsed = await safeJson(res)
      if (!parsed.ok) {
        throw new Error(parsed.error || 'Failed to delete journey.')
      }
      setTrips((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete trip.')
    }
  }

  // Add Wishlist item
  async function handleAddWishlist(item: { title: string; location: string; season: string; vibe: string }) {
    if (token === 'guest-token') {
      const localWish: WishlistItem = { ...item, id: `w-${Date.now()}` }
      setWishlist((prev) => [localWish, ...prev])
      return
    }

    const res = await authFetch('/api/wishlists', {
      method: 'POST',
      body: JSON.stringify(item),
    })
    const parsed = await safeJson<WishlistItem>(res)
    if (!parsed.ok || !parsed.data) {
      throw new Error(parsed.error || 'Failed to save wishlist destination.')
    }
    setWishlist((prev) => [parsed.data!, ...prev])
  }

  // Remove Wishlist item
  async function handleRemoveWishlist(id: string | number) {
    if (token === 'guest-token') {
      setWishlist((prev) => prev.filter((w) => w.id !== id))
      return
    }

    const res = await authFetch(`/api/wishlists/${id}`, { method: 'DELETE' })
    const parsed = await safeJson(res)
    if (!parsed.ok) {
      throw new Error(parsed.error || 'Failed to remove wishlist item.')
    }
    setWishlist((prev) => prev.filter((w) => w.id !== id))
  }

  // Update profile / password
  async function handleUpdateProfile(name: string, currentPassword?: string, newPassword?: string) {
    if (token === 'guest-token') {
      setUser((prev) => (prev ? { ...prev, name } : null))
      return
    }

    const res = await authFetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, currentPassword, newPassword }),
    })
    const parsed = await safeJson<{ user: User }>(res)
    if (!parsed.ok || !parsed.data?.user) {
      throw new Error(parsed.error || 'Profile update failed.')
    }
    setUser(parsed.data.user)
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
    return <AuthPage onAuthSuccess={handleAuthSuccess} onGuestAccess={handleGuestAccess} />
  }

  // Authenticated Application
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2B231D] selection:bg-[#E8654A] selection:text-white">
      {/* Top Header */}
      <Header
        user={user}
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
