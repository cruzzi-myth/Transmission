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
import youtubeRouter from "./youtube.js";

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use("/api/youtube", youtubeRouter);

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout attempts. Please wait a few minutes and try again." },
});

// Stripe and Cloudinary webhooks need the raw body to verify their signatures.
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
app.post("/api/stripe/create-checkout-session", express.json(), checkoutLimiter, createCheckoutSession);
app.post("/api/cloudinary/moderation-webhook", express.text({ type: "*/*" }), handleCloudinaryWebhook);

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Transmission server listening on http://localhost:${PORT}`);
});
