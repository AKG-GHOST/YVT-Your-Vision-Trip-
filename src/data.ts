export function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
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
