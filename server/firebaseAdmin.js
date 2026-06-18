import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// Accepts either a file path (default) or a raw JSON string in the env var,
// so this works the same whether you're running locally with a downloaded
// key file or deploying somewhere that injects secrets as env vars directly.
function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    if (raw.trim().startsWith("{")) return JSON.parse(raw);
    return JSON.parse(fs.readFileSync(raw, "utf8"));
  } catch {
    return null;
  }
}

const serviceAccount = loadServiceAccount();
let db = null;
try {
  if (serviceAccount) {
    const app = initializeApp({ credential: cert(serviceAccount) });
    db = getFirestore(app);
    console.log("[firebaseAdmin] Firebase Admin initialized successfully.");
  } else {
    console.warn(
      "[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT_JSON not set — Stripe/Cloudinary webhook routes will not work. " +
      "YouTube and health routes are unaffected."
    );
  }
} catch (err) {
  console.error("[firebaseAdmin] Failed to initialize Firebase Admin (bad credentials?):", err.message);
  console.warn("[firebaseAdmin] Stripe/Cloudinary webhook routes will not work. YouTube and health routes are unaffected.");
}
export { db };
