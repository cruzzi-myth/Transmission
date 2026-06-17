import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// Accepts either a file path (default) or a raw JSON string in the env var,
// so this works the same whether you're running locally with a downloaded
// key file or deploying somewhere that injects secrets as env vars directly.
function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not set. Download a service account key from " +
      "Firebase Console > Project Settings > Service Accounts, and either point this " +
      "env var at the file path or paste the JSON contents directly."
    );
  }
  if (raw.trim().startsWith("{")) return JSON.parse(raw);
  return JSON.parse(fs.readFileSync(raw, "utf8"));
}

const app = initializeApp({ credential: cert(loadServiceAccount()) });
export const db = getFirestore(app);
