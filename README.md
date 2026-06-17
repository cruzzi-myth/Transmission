# Transmission (Netflix/YouTube hybrid)

A tiered streaming feed (curated TMDB catalog, gated by membership tier) plus
a community section where members upload their own show/movie content,
subject to a guidelines checklist and a moderation queue.

React + Vite, Firebase for auth/data, TMDB for the curated catalog,
Cloudinary for real video upload/storage/playback.

## Setup

```
npm install
cp .env.example .env
```

Fill in `.env` with:
- A free TMDB API key
- Your Firebase project config (Auth + Firestore enabled, same as before)
- A Cloudinary cloud name + unsigned upload preset (see comments in `.env.example`
  for exact steps - this is the one piece of new setup vs the earlier Netflix clone)

```
npm run dev
```

## What's real vs demo-only

**Real and working:**
- Firebase email/password auth
- Tiered catalog access - Free tier sees fewer genre rows, Plus/Pro see the
  full curated library (client-side gating only, see note below)
- Actual video upload to Cloudinary with progress tracking
- Guidelines checklist gating submission
- Pending → approved/rejected moderation workflow, stored in Firestore
- Community page: browse, filter by category, sort by views/recency
- My Studio: creators see their own uploads and review status
- View counting on uploaded content

**Demo-only / explicitly flagged in code:**
- **Tier selection has no real payment processor.** Switching tiers on the
  `/tiers` page just writes directly to Firestore. A real version would call
  Stripe (or similar) and only update the tier after payment succeeds via a
  webhook, not client-side.
- **Moderation queue (`/moderation`) has no role gating.** Any logged-in user
  can currently approve or reject uploads. A real version needs a `role`
  field checked both in the UI and in Firestore security rules.
- **Tier limits (upload caps, catalog access) are enforced client-side only.**
  Someone could edit their own Firestore doc directly and bypass this. Real
  enforcement needs Firestore security rules or a backend function.
- Cross-platform "connect your streaming accounts" was explicitly scoped out
  - no public APIs exist for pulling user data from Netflix/Hulu/Disney+ etc,
    so this was dropped rather than faked.

## Cost notes

- TMDB, Firebase (Spark/free tier), and the frontend itself: free at demo scale.
- **Cloudinary is the one part of this project most likely to cost money** if
  you upload many or large video files - it has a free tier but video
  storage/bandwidth eats through it fastest of any media type. Check the
  usage tab in your Cloudinary dashboard periodically.

## Project structure

```
src/
  components/   Navbar, Hero, ContentCard, ContentRow, ProtectedRoute
  pages/        Login, Home, Watch, Search, Upload, Studio,
                ModerationQueue, Tiers, Community
  context/      AuthContext
  utils/        firebase.js, tmdb.js, cloudinaryUpload.js
```

## Design system

Token-based "Transmission" identity (broadcast/CRT metaphor) defined in
`src/index.css` - color, type, spacing, and motion all driven by CSS
variables rather than one-off values, so the look stays consistent as more
pages get added.
