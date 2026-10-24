import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Lock, Mail, User, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import type { User as UserType } from '../types'

type Props = {
  onAuthSuccess: (user: UserType, token: string) => void
}

export default function AuthPage({ onAuthSuccess }: Props) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      setError('Please provide a valid email address (e.g. name@domain.com).')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (isRegister) {
      if (name.trim().length < 2) {
        setError('Please enter your full name (at least 2 characters).')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify and re-enter your password.')
        return
      }
    }

    setLoading(true)

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'
      const payload = isRegister
        ? { name: name.trim(), email: cleanEmail, password }
        : { email: cleanEmail, password }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(payload),
      })

      const rawText = await res.text()
      let data: any = {}
      try {
        data = rawText ? JSON.parse(rawText) : {}
      } catch {
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          throw new Error('Authentication server is temporarily unreachable. Please check your connection or try again shortly.')
        } else {
          throw new Error(`Server returned an unexpected response (${res.status}). Please try again.`)
        }
      }

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(data.error || 'No account found with this email. Please verify your email or click Create Account.')
        } else if (res.status === 401) {
          throw new Error(data.error || 'Incorrect password. Please verify your password and try again.')
        } else if (res.status === 409) {
          throw new Error(data.error || 'An account with this email address already exists. Please sign in.')
        } else if (res.status === 429) {
          throw new Error(data.error || 'Too many authentication attempts. Please wait 15 minutes before trying again.')
        } else if (res.status >= 500) {
          throw new Error(data.error || 'Database service is temporarily unavailable. Please try again shortly.')
        }
        throw new Error(data.error || 'Authentication failed. Please verify your credentials.')
      }

      onAuthSuccess(data.user, data.token)
    } catch (err) {
      if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
        setError('Unable to reach the authentication server. Please check your internet connection.')
      } else {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred during authentication.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between p-4 sm:p-6 text-[#2B231D] selection:bg-[#E8654A] selection:text-white">
      {/* Top Brand Bar */}
      <header className="max-w-md mx-auto w-full pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#E8654A]" />
          <span className="text-xs font-semibold tracking-[0.35em] text-[#2B231D] uppercase">
            T I N K E R <span className="text-[#A89682] font-light">·</span> T R A I L
          </span>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EDE5DB]/70 text-[10px] font-mono text-[#6B5D4F]">
          <ShieldCheck className="w-3 h-3 text-emerald-600" /> SECURE AUTH
        </span>
      </header>

      {/* Center Auth Card */}
      <div className="max-w-md mx-auto w-full my-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-[#EDE5DB] bg-white p-6 sm:p-8 shadow-sm"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF8F5] text-[10px] font-mono tracking-widest text-[#8A7968] uppercase border border-[#EDE5DB]">
              <Sparkles className="w-3 h-3 text-[#E8654A]" /> Private Travel Sanctuary
            </span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#2B231D]">
              {isRegister ? 'Create Your Account' : 'Welcome Back'}
            </h1>
            <p className="mt-1.5 text-xs text-[#8A7968]">
              {isRegister
                ? 'Sign up to curate and safely store your journeys & wishlists.'
                : 'Sign in to access your private journeys, wishlists & routes.'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#F5F0EA] mb-6 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false)
                setError('')
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                !isRegister ? 'bg-white text-[#2B231D] shadow-xs font-semibold' : 'text-[#8A7968] hover:text-[#2B231D]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true)
                setError('')
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                isRegister ? 'bg-white text-[#2B231D] shadow-xs font-semibold' : 'text-[#8A7968] hover:text-[#2B231D]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs leading-relaxed"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-[#5C4D3C] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#A89682] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DDD2C4] bg-[#FAF8F5] text-xs text-[#2B231D] placeholder:text-[#B8A896] outline-none focus:border-[#E8654A] focus:bg-white focus:ring-2 focus:ring-[#E8654A]/10 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#5C4D3C] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A89682] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DDD2C4] bg-[#FAF8F5] text-xs text-[#2B231D] placeholder:text-[#B8A896] outline-none focus:border-[#E8654A] focus:bg-white focus:ring-2 focus:ring-[#E8654A]/10 transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#5C4D3C]">
                  Password
                </label>
                {isRegister && (
                  <span className="text-[10px] text-[#A89682]">Min. 6 characters</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#A89682] absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#DDD2C4] bg-[#FAF8F5] text-xs text-[#2B231D] placeholder:text-[#B8A896] outline-none focus:border-[#E8654A] focus:bg-white focus:ring-2 focus:ring-[#E8654A]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#A89682] hover:text-[#5C4D3C] p-0.5 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-[#5C4D3C] mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#A89682] absolute left-3.5 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#DDD2C4] bg-[#FAF8F5] text-xs text-[#2B231D] placeholder:text-[#B8A896] outline-none focus:border-[#E8654A] focus:bg-white focus:ring-2 focus:ring-[#E8654A]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-[#A89682] hover:text-[#5C4D3C] p-0.5 cursor-pointer"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-2xl bg-[#E8654A] hover:bg-[#D75438] active:scale-[0.99] text-white text-xs font-semibold shadow-md shadow-[#E8654A]/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isRegister ? 'Creating Account...' : 'Signing In...'}</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? 'Create Your Account' : 'Sign In'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Privacy Note */}
          <div className="mt-5 text-center text-[11px] text-[#A89682] leading-relaxed">
            All passwords are encrypted with bcrypt. Your journeys and wishlist items are isolated to your private account.
          </div>
        </motion.div>
      </div>

      {/* Bottom Footer */}
      <footer className="text-center py-2 text-[10px] font-mono text-[#A89682]">
        TRIPTRAIL ARCHIVE · SECURE USER AUTHENTICATION
      </footer>
    </div>
  )
}
