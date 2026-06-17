# Transmission (Netflix/YouTube hybrid)

A tiered streaming feed (curated TMDB catalog, gated by membership tier) plus
a community section where members upload their own show/movie content,
subject to a guidelines checklist, automated content scanning, and a
moderation queue.

React + Vite frontend, Firebase for auth/data, TMDB for the curated catalog,
Cloudinary for video upload/storage/playback/auto-moderation, Stripe for
real subscription billing, and a small Express server for everything that
needs a trusted backend (Stripe webhooks, Cloudinary moderation webhook).

## Setup

### Frontend

```
npm install
cp .env.example .env
```

Fill in `.env` with:
- A free TMDB API key
- Your Firebase project config (Auth + Firestore enabled)
- A Cloudinary cloud name + unsigned upload preset
- `VITE_SERVER_URL` pointing at the backend server (see below) - defaults to
  `http://localhost:8787` if not set

```
npm run dev
```

### Backend server (new - required for Stripe and auto-moderation)

```
cd server
npm install
cp .env.example .env
```

Fill in `server/.env` with:
- A Firebase service account key (Project Settings → Service Accounts →
  Generate new private key)
- Cloudinary cloud name / API key / API secret
- Stripe secret key, webhook secret, and a price ID per paid tier
  (create these in Stripe Dashboard → Product catalog first)

```
npm start
```

This needs to be running (or deployed somewhere reachable) for tier
upgrades and automated content moderation to actually work. The frontend
will still run without it, but `/tiers` checkout and the moderation scan
pipeline won't function.

## What's real vs demo-only (updated)

**Real and working:**
- Firebase email/password auth, with password reset and email verification
- Tiered catalog access
- Real video upload to Cloudinary with progress tracking, file size limits,
  and timeout handling
- Guidelines checklist gating submission
- **Automated content pre-screening** via a Cloudinary moderation add-on
  (WebPurify or Amazon Rekognition, configured in the Cloudinary dashboard)
  - flagged content is auto-rejected before it ever reaches a human
    moderator
- Pending → approved/rejected moderation workflow, stored in Firestore, now
  also gated on the automated scan result (`moderationStatus`)
- **Real Stripe Checkout for tier upgrades** - no more direct Firestore
  writes from the client; tier changes only happen via a verified Stripe
  webhook after payment is actually confirmed
- Subscription cancellation/payment failure automatically downgrades back
  to free tier
- **User-facing content reporting** - any signed-in user can report a
  piece of content; reports land in a separate `/reports` queue for
  moderators, who can take the content down and/or suspend the uploader
- **Account deletion** (with required password re-entry) and **password
  reset** flows
- Role-based access control for moderation and reports, enforced
  server-side via `firestore.rules`
- Tier/role/suspended tampering blocked server-side - users cannot write
  these fields on their own profile under any circumstance now (previously
  tier was still self-editable; that gap is closed)
- Loading and error states (not just empty states) on Community, Studio,
  and Moderation Queue
- A "content not found" state on the Watch page instead of a blank screen

**Demo-only / explicitly flagged / needs more work before real launch:**
- **Legal documents are templates, not final.** See `legal/` - Terms of
  Service, Privacy Policy, and Content Guidelines are all drafted but
  marked for mandatory lawyer review before publishing for real users.
- **Account deletion doesn't clean up uploads.** Deleting your account
  removes your Auth login and Firestore profile, but NOT your past
  uploaded videos (Firestore docs or the actual Cloudinary files). A real
  implementation needs a Cloud Function triggered on account deletion that
  also deletes/anonymizes the user's `uploads` docs and calls Cloudinary's
  delete API for the associated video files. The Privacy Policy template
  flags this gap explicitly so it isn't silently misrepresented to users.
- **Signup/upload rate limiting is partially server-side.** The backend
  rate-limits the Stripe checkout-session endpoint, but Cloudinary uploads
  and Firebase signups happen directly from the browser to those services,
  not through this server, so they can't be rate-limited here. See
  "Rate limiting" below for where this actually needs to be configured.
- Cross-platform "connect your streaming accounts" remains explicitly
  scoped out - no public APIs exist for pulling user data from major
  streaming platforms.

## Automated content moderation setup

This is dashboard configuration in Cloudinary, not code - see the comment
block at the top of `src/utils/cloudinaryUpload.js` for the exact steps
(enable a moderation add-on on your upload preset, set the webhook
notification URL to point at this server's
`/api/cloudinary/moderation-webhook` endpoint). Once configured, every
upload is scanned automatically and the result is written back by
`server/moderationWebhook.js` - this is the only code path allowed to set
the `moderationStatus` field, per `firestore.rules`.

## Stripe setup

1. Create a Stripe account (test mode is fine for development)
2. Stripe Dashboard → Product catalog → create one product per paid tier
   (Plus, Pro), each with a recurring monthly price - copy the price IDs
   into `server/.env`
3. Stripe Dashboard → Developers → Webhooks → add an endpoint pointing at
   `https://your-server-domain.com/api/stripe/webhook`, listening for at
   minimum `checkout.session.completed`, `customer.subscription.deleted`,
   and `invoice.payment_failed` - copy the signing secret into
   `server/.env` as `STRIPE_WEBHOOK_SECRET`
4. For local testing, use the Stripe CLI (`stripe listen --forward-to
   localhost:8787/api/stripe/webhook`) to forward webhook events to your
   machine, since Stripe can't reach `localhost` directly

Stripe Checkout (the hosted payment page used here) is the cheapest option
to start with - flat 2.9% + 30¢ per transaction, no monthly fee, and
Stripe handles PCI compliance since card data never touches this app's
code.

## Rate limiting (where each part actually lives)

- **Stripe checkout-session creation:** rate-limited in this server
  (`server/index.js`) - 10 requests per 15 minutes per IP.
- **Firebase signups:** configure in Firebase Console → Authentication →
  Settings → enable App Check + reCAPTCHA. This server cannot rate-limit
  signups because they go directly from the browser to Firebase.
- **Cloudinary uploads:** configure a max file size on your upload preset
  (Settings → Upload → your preset). For real per-user upload limits
  enforced server-side (not just trusted from the client), switch from
  unsigned to signed uploads, which requires this server to generate a
  signature per upload - a larger change than what's built here, flagged
  for a future pass if abuse becomes a real problem at your user volume.

## Deploying the Firestore security rules

1. Firebase Console → your project → Firestore Database → **Rules** tab
2. Replace the existing rules with the contents of `firestore.rules` in
   this repo
3. Click **Publish**

### Bootstrapping your first moderator

The rules intentionally block anyone from setting their own `role` to
`moderator`. Since there's no moderator yet, grant the first one manually:

1. Firebase Console → Firestore Database → **Data** tab
2. Find `users/{your-uid}` (your uid is visible in Authentication → Users)
3. Edit the `role` field directly from "member" to "moderator"
4. Reload the app - you should now see the moderation queue at
   `/moderation` and the reports queue at `/reports`

## Cost notes

- TMDB, Firebase (Spark/free tier), and the frontend itself: free at demo
  scale.
- **Cloudinary** is the part most likely to cost money with real video
  traffic - check the usage tab in your dashboard periodically. Moderation
  add-on scans also typically have their own free-tier quota separate from
  storage/bandwidth.
- **Stripe** only costs money per successful transaction (2.9% + 30¢) -
  free to set up and test.
- **This backend server** needs to run somewhere reachable from the
  internet for Stripe/Cloudinary webhooks to work in production (a small
  Railway/Render/Fly.io instance is the usual cheap option; running it on
  localhost only works for local development).

## Project structure

```
src/
  components/   Navbar, Hero, ContentCard, ContentRow,
                ProtectedRoute, ModeratorRoute
  pages/        Login, ForgotPassword, Home, Watch, Search, Upload,
                Studio, ModerationQueue, Reports, Tiers, Community,
                Settings
  context/      AuthContext
  utils/        firebase.js, tmdb.js, cloudinaryUpload.js
server/
  index.js              Express app, route wiring, rate limiting
  firebaseAdmin.js       Admin SDK init (trusted, bypasses client rules)
  stripeHandlers.js      Checkout session creation + payment webhook
  moderationWebhook.js   Cloudinary moderation result webhook
legal/
  TERMS_OF_SERVICE_TEMPLATE.md
  PRIVACY_POLICY_TEMPLATE.md
  CONTENT_GUIDELINES_TEMPLATE.md
```

## Design system

Token-based "Transmission" identity (broadcast/CRT metaphor) defined in
`src/index.css` - color, type, spacing, and motion all driven by CSS
variables rather than one-off values, so the look stays consistent as more
pages get added.
