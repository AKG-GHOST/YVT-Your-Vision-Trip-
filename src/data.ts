import type { Trip, WishlistItem } from './types'

export const demoTrips: Trip[] = [
  {
    id: 1,
    title: 'Coastal mornings',
    location: 'Goa, India',
    start_date: '2026-08-24',
    end_date: '2026-08-29',
    note: 'Salt air, slow breakfasts, and a little blue-sky thinking. The scent of pine and ocean mist carried us through the coastline.',
    mood: 'sunny',
  },
  {
    id: 2,
    title: 'A weekend in the hills',
    location: 'Munnar, India',
    start_date: '2026-07-12',
    end_date: '2026-07-14',
    note: 'Tea gardens rolling under dense morning clouds. Misty roads, warm chai at roadside stalls, and absolute serenity.',
    mood: 'mist',
  },
  {
    id: 3,
    title: 'City of electric lights',
    location: 'Mumbai, India',
    start_date: '2026-06-01',
    end_date: '2026-06-05',
    note: 'Midnight drives along Marine Drive with sea spray in our faces. Vibrant street energy, spicy cutting chai, and neon reflections.',
    mood: 'electric',
  },
  {
    id: 4,
    title: 'Slow days in Pondicherry',
    location: 'Pondicherry, India',
    start_date: '2026-05-18',
    end_date: '2026-05-22',
    note: 'French quarters, pastel yellow colonial alleys, old bookshops, and slow café au lait watching the tides come in.',
    mood: 'slow',
  },
]

export const demoWishlist: WishlistItem[] = [
  {
    id: 'w-1',
    title: 'Kyoto bamboo groves & temple trails',
    location: 'Kyoto, Japan',
    season: 'Autumn (Nov)',
    vibe: 'Zen & Contemplative',
  },
  {
    id: 'w-2',
    title: 'Amalfi cliffside sunset drive',
    location: 'Amalfi Coast, Italy',
    season: 'Late Spring (May)',
    vibe: 'Coastal & Golden Hour',
  },
  {
    id: 'w-3',
    title: 'Spiti Valley high-altitude starry skies',
    location: 'Himachal, India',
    season: 'Summer (July)',
    vibe: 'Adventure & Stargazing',
  },
]

export function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(
      new Date(`${date}T00:00:00`)
    )
  } catch {
    return date
  }
}

export function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export const moodConfig = {
  sunny: {
    icon: '☀️',
    label: 'Sunny',
    bg: 'bg-amber-50',
    accent: 'bg-amber-400',
    text: 'text-amber-800',
    gradientFrom: 'from-amber-100',
    gradientTo: 'to-orange-50',
    artBg: 'bg-gradient-to-br from-[#F5D5AE] to-[#E88A58]',
    artCircle: 'bg-[#D7684B]/40',
  },
  mist: {
    icon: '☁️',
    label: 'Misty',
    bg: 'bg-slate-50',
    accent: 'bg-slate-400',
    text: 'text-slate-700',
    gradientFrom: 'from-slate-100',
    gradientTo: 'to-blue-50',
    artBg: 'bg-gradient-to-br from-[#C8D6D9] to-[#8FAEB5]',
    artCircle: 'bg-[#5B8088]/40',
  },
  electric: {
    icon: '⚡',
    label: 'Electric',
    bg: 'bg-violet-50',
    accent: 'bg-violet-500',
    text: 'text-violet-800',
    gradientFrom: 'from-violet-100',
    gradientTo: 'to-pink-50',
    artBg: 'bg-gradient-to-br from-[#D8B4E2] to-[#B26BD8]',
    artCircle: 'bg-[#8E44AD]/40',
  },
  slow: {
    icon: '🌿',
    label: 'Slow',
    bg: 'bg-emerald-50',
    accent: 'bg-emerald-400',
    text: 'text-emerald-800',
    gradientFrom: 'from-emerald-100',
    gradientTo: 'to-teal-50',
    artBg: 'bg-gradient-to-br from-[#C3E4C7] to-[#7BC58A]',
    artCircle: 'bg-[#3D9970]/40',
  },
}
