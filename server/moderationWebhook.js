import crypto from "crypto";
import { db } from "./firebaseAdmin.js";

// Cloudinary signs webhook payloads with your API secret so you can verify
// the request actually came from Cloudinary and wasn't forged by someone
// hitting this endpoint directly. See:
// https://cloudinary.com/documentation/notifications#verifying_notification_signatures
function verifyCloudinarySignature(body, timestamp, signature) {
  const payload = body + timestamp + process.env.CLOUDINARY_API_SECRET;
  const expected = crypto.createHash("sha1").update(payload).digest("hex");
  return expected === signature;
}

// Maps whatever moderation add-on you've configured in Cloudinary to a
// simple clear/flagged decision. Adjust this if you use a different add-on -
// the shape of `notification.moderation_status` and the rekognition payload
// vary by provider. This handles Cloudinary's generic `moderation` webhook
// shape (works with WebPurify, Amazon Rekognition AI Moderation, and the
// duplicate-detection add-on).
function interpretModerationPayload(notification) {
  const results = notification.moderation || [];
  // "rejected" from any configured moderation kind = flag it
  const flagged = results.some((m) => m.status === "rejected");
  return flagged ? "flagged" : "clear";
}

export async function handleCloudinaryWebhook(req, res) {
  // req.body must be the raw string here (see index.js - this route uses
  // express.text(), not express.json()) because the signature is computed
  // over the exact raw bytes Cloudinary sent.
  const timestamp = req.headers["x-cld-timestamp"];
  const signature = req.headers["x-cld-signature"];

  if (!timestamp || !signature || !verifyCloudinarySignature(req.body, timestamp, signature)) {
    return res.status(401).json({ error: "Invalid Cloudinary webhook signature" });
  }

  const notification = JSON.parse(req.body);

  // We only care about moderation-complete notifications here.
  if (notification.notification_type !== "moderation") {
    return res.status(200).json({ ignored: true });
  }

  const publicId = notification.public_id;
  if (!publicId) return res.status(400).json({ error: "Missing public_id" });

  const decision = interpretModerationPayload(notification);

  // Find the upload doc by cloudinaryPublicId and write the verdict.
  // This is the ONLY code path in the entire system that sets
  // moderationStatus - the Firestore rules block every client-side path,
  // so this server (using the Admin SDK, which bypasses rules) is the sole
  // source of truth for this field.
  const snap = await db.collection("uploads").where("cloudinaryPublicId", "==", publicId).limit(1).get();
  if (snap.empty) {
    console.warn(`Moderation webhook for unknown publicId: ${publicId}`);
    return res.status(200).json({ found: false });
  }

  const uploadDoc = snap.docs[0];
  await uploadDoc.ref.update({
    moderationStatus: decision,
    moderationCheckedAt: new Date(),
  });

  // If the automated scan flags it, auto-reject regardless of what a human
  // moderator does later - this is the "automated pre-screen before it even
  // reaches your queue" behavior. Flagged content never shows up in
  // getPendingUploads() at all (see firebase.js change), so a moderator
  // won't waste time reviewing things the scanner already caught.
  if (decision === "flagged") {
    await uploadDoc.ref.update({ status: "rejected", autoRejectedReason: "Failed automated content scan" });
  }

  return res.status(200).json({ ok: true, decision });
}
