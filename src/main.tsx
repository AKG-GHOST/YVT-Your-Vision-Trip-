import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Immediately purge stale Service Worker and stale PWA caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister()
    }
  }).catch(() => {})
}

if ('caches' in window) {
  caches.keys().then((keys) => {
    keys.forEach((key) => caches.delete(key))
  }).catch(() => {})
}

// Clear any old guest-mode dummy data from localStorage
try {
  localStorage.removeItem('triptrail_guest_trips')
  localStorage.removeItem('triptrail_guest_wishlist')
  if (localStorage.getItem('triptrail_token') === 'guest-token') {
    localStorage.removeItem('triptrail_token')
  }
} catch {
  // ignore
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
