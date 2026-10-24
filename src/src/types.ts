export type User = {
  id: number
  name: string
  email: string
  created_at?: string
}

export type Trip = {
  id?: number
  user_id?: number
  title: string
  location: string
  start_date: string
  end_date: string
  note: string
  mood: 'sunny' | 'mist' | 'electric' | 'slow'
  created_at?: string
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
  id: string | number
  user_id?: number
  title: string
  location: string
  season: string
  vibe: string
  created_at?: string
}
