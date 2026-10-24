# TripTrail (Tinker Edition) ✦

A sleek, minimalistic trip journaling progressive web application (PWA) with an AI-powered route curator, backed by persistent relational database storage with **full user authentication, session management, and strict user data isolation**.

Crafted with an editorial luxury aesthetic inspired by minimalist timepiece design (warm sand/beige undertones, refined serif typography, porcelain ceramic accents, and vibrant color highlights).

---

## ✦ Production Authentication & User System

- **User Accounts & Registration**:
  - Secure account registration (`name`, `email`, `password`)
  - Password hashing with `bcryptjs` (salt rounds: 10)
  - Password strength requirements and email format validation
  - Dual session management: HTTP-only secure cookie + JWT Bearer token
- **User Data Isolation**:
  - Every trip, journal reflection, wishlist item, and personal setting is bound strictly to the authenticated `user_id`
  - Zero cross-user data leakage
  - Real database persistence:
    - **Local Environment**: Automatically initializes and uses persistent SQLite (`data/triptrail.db`) with zero setup required
    - **Cloud Deployment**: Automatically connects to hosted PostgreSQL when `DATABASE_URL` is configured
- **Clean Slate**:
  - Zero dummy, hardcoded, or mock test data
  - Welcoming empty states when an account is newly registered

---

## ✦ Core Features

- **Tinker Editorial Aesthetic**: Warm sand & linen split palette (`#FAF8F5`, `#EFE5DA`, `#D5C2B0`), Playfair Display serif headlines, frosted glass buttons, and vibrant coral/ocean/lime micro-accents.
- **AI Route Curator**: Natural-language route extraction via OpenAI (`gpt-4o-mini`) + live Google Routes API directions, with preset one-tap itineraries and instant Google Maps links.
- **Trip Memory Journal**: Capture titles, destinations, date ranges, and personal reflections tagged with four evocative vibes:
  - ☀️ **Sunny** (warm golden gradients)
  - ☁️ **Misty** (slate and cool blue gradients)
  - ⚡ **Electric** (neon violet & pink gradients)
  - 🌿 **Slow** (sage & emerald gradients)
- **Wishlist & Dream Itineraries**: Plan future voyages with target seasons and curated vibes.
- **Trip Detail Modal & Sharing**: Full story inspection, one-click story copying, and Google Maps search.
- **Traveler Hub (Account & Storage Diagnostics)**: Update display name, change password, live relational database status, JSON backup export, and secure logout.
- **Progressive Web App (PWA)**: Standalone installable app on iOS and Android with service worker offline caching.

---

## ✦ Quick Start

### 1. Install & Run in Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### 2. Build & Run the Production Server

```bash
npm run build
npm start
```

The Express server serves the compiled frontend and API at `http://localhost:8787`.

---

## ✦ Environment Configuration

Create a `.env` file at the root:

```env
PORT=8787
JWT_SECRET=your-random-jwt-secret-key-here

# Optional: PostgreSQL Connection String (if omitted, automatically uses persistent SQLite data/triptrail.db)
DATABASE_URL=postgresql://postgres:password@localhost:5432/triptrail
DATABASE_SSL=false

# Optional: AI Route Waypoint Extraction
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Optional: Google Maps Routes API (computes live traffic polylines and duration)
GOOGLE_MAPS_API_KEY=
```
