export type Trip = {
  id?: number
  title: string
  location: string
  start_date: string
  end_date: string
  note: string
  mood: 'sunny' | 'mist' | 'electric' | 'slow'
  cover_url?: string
}

export type RouteResult = {
  mode: 'demo' | 'google'
  stops: string[]
  distance: string
  duration: string
  mapsUrl: string
  polyline?: string
  message?: string
}

export type Tab = 'home' | 'journeys' | 'saved' | 'profile'

export type WishlistItem = {
  id: string
  title: string
  location: string
  season: string
  vibe: string
}
