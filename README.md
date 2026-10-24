# TripTrail (Tinker Edition) ✦

A sleek, minimalistic trip journaling progressive web application (PWA) with an AI-powered route curator, backed by PostgreSQL with zero-config offline fallbacks.

Crafted with an editorial luxury aesthetic inspired by minimalist timepiece design (warm sand/beige undertones, refined serif typography, porcelain ceramic accents, and vibrant color highlights).

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
- **Traveler Hub (Storage Diagnostics)**: Live PostgreSQL connection status, database version ping, JSON backup export, and sample trip restore.
- **Progressive Web App (PWA)**: Standalone installable app on iOS and Android with service worker offline caching.
- **Production Ready & Deployable**: Docker, Docker Compose, Express single-server production distribution.

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

### 3. One-Command Docker Setup

```bash
docker compose up --build
```

Starts the TripTrail app and a dedicated PostgreSQL 16 database.

---

## ✦ Environment Configuration

Create a `.env` file at the root:

```env
PORT=8787
DATABASE_URL=postgresql://postgres:password@localhost:5432/triptrail
DATABASE_SSL=false
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
GOOGLE_MAPS_API_KEY=
```

> **Note:** All features run out-of-the-box in local demo mode if no environment keys are provided!

---

## ✦ Deployment Targets

- **Render / Railway / Fly.io**: Connect your Git repository, set build command `npm run build`, and start command `npm start`.
- **Docker Platforms**: The included multi-stage `Dockerfile` produces an ultra-lean Alpine image (~120MB).
