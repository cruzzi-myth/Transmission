import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __serverDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__serverDir, ".env") });
import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { createCheckoutSession, handleStripeWebhook } from "./stripeHandlers.js";
import { handleCloudinaryWebhook } from "./moderationWebhook.js";
import youtubeRouter from './youtube.js';

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use('/api/youtube', youtubeRouter);

// ---------- rate limiting ----------
// These cap how many times a single IP can hit cost-sensitive or
// abuse-prone endpoints in a 15-minute window. This is the server-side
// half of "rate limiting on signups and uploads" - the frontend never
// talks to Cloudinary or Firebase Auth through this server directly
// (those go straight from the browser, which is normal for Cloudinary's
// unsigned-upload pattern and Firebase Auth's SDK), so the meaningful
// place to rate-limit on this server is the Checkout-session creation
// endpoint, which is the one server route a malicious script could hammer.
//
// IMPORTANT CAVEAT: Cloudinary upload requests and Firebase signups happen
// directly from the browser to Cloudinary/Firebase, not through this
// server, so THIS rate limiter can't throttle those. True signup/upload
// rate limiting needs to be configured in:
//   - Firebase Console > Authentication > Settings > the built-in abuse
//     protection (enable "Enforce App Check" + reCAPTCHA there), and
//   - Cloudinary's upload preset settings (Settings > Upload > your preset
//     > set a max file size, and consider requiring authenticated/signed
//     uploads instead of unsigned once you have real users, which lets you
//     enforce per-user limits server-side rather than trusting the client).
// See README "Rate limiting" section for the exact steps in each console.
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout attempts. Please wait a few minutes and try again." },
});

// ---------- Stripe ----------
// Stripe's webhook needs the raw request body (not parsed JSON) to verify
// the signature, so this route gets express.raw() instead of express.json().
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

app.post("/api/stripe/create-checkout-session", express.json(), checkoutLimiter, createCheckoutSession);

// ---------- Cloudinary moderation webhook ----------
// Same raw-body requirement as Stripe, for the same reason (signature
// verification needs the exact original bytes).
app.post("/api/cloudinary/moderation-webhook", express.text({ type: "*/*" }), handleCloudinaryWebhook);

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Transmission server listening on http://localhost:${PORT}`);
});
