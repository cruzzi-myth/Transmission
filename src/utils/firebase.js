import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// three tiers - free / plus / pro. limits enforced client-side for the demo;
// a real product would also enforce these in Firestore security rules / a
// backend function so someone can't just edit their own doc to upgrade themselves.
// catalogAccess controls how much of the curated (TMDB-sourced) library shows
// in the feed - "limited" caps it to a smaller curated slice, "full" shows everything.
export const TIERS = {
  free: { label: "Free", uploadLimitPerMonth: 2, maxResolution: "720p", catalogAccess: "limited", catalogRowCap: 2 },
  plus: { label: "Plus", uploadLimitPerMonth: 15, maxResolution: "1080p", catalogAccess: "full", catalogRowCap: 5 },
  pro: { label: "Pro", uploadLimitPerMonth: Infinity, maxResolution: "4K", catalogAccess: "full", catalogRowCap: 8 },
};

export const signupUser = async (name, email, password) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, "users", cred.user.uid), {
    name,
    email: email.trim().toLowerCase(),
    createdAt: serverTimestamp(),
    tier: "free",
    role: "member",
    uploadsThisMonth: 0,
    bio: "",
    suspended: false,
  });
  // Fire off a verification email so the address is confirmed before the
  // account is treated as fully trusted. We don't currently block login on
  // this (no `if (!emailVerified)` gate anywhere), so it's a soft nudge for
  // now rather than a hard requirement - see README "Email verification"
  // for the option to make it a hard gate later.
  await sendEmailVerification(cred.user).catch((err) =>
    console.warn("Could not send verification email:", err.message)
  );
  return cred.user;
};

export const loginUser = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);
export const subscribeToAuthChanges = (cb) => onAuthStateChanged(auth, cb);

// ---------- account recovery / auth hygiene ----------
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim().toLowerCase());

export const resendVerificationEmail = () => {
  if (!auth.currentUser) throw new Error("Not signed in");
  return sendEmailVerification(auth.currentUser);
};

// Deleting an account requires re-entering the password first (Firebase
// requires a "recent login" for destructive auth operations like this -
// reauthenticating proves the request is really coming from the account
// owner, not from someone who found an unlocked, already-logged-in tab).
export const deleteOwnAccount = async (password) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  // Delete the Firestore profile first - if this were reversed and the
  // Auth deletion succeeded but the Firestore delete then failed, the
  // person would be locked out with no way to clean up their own orphaned
  // profile document (the rules require auth to delete it).
  await deleteDoc(doc(db, "users", user.uid));
  await deleteUser(user);
};

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};

export const updateUserProfile = (uid, data) => updateDoc(doc(db, "users", uid), data);

// NOTE: there used to be a `setUserTier(uid, tier)` export here that wrote
// the tier directly to Firestore from the client. It's removed because the
// new Firestore rules block clients from writing their own tier field at
// all (see firestore.rules) - this function would now just throw a
// permission-denied error if called. Real tier changes only happen through
// startTierCheckout below, which redirects to Stripe, and the resulting
// webhook (server/stripeHandlers.js) writes the tier using the Admin SDK,
// which bypasses client-facing rules entirely.

// Calls the backend to create a Stripe Checkout session, then redirects the
// browser there. Stripe hosts the actual payment form - card details never
// pass through this app's frontend or backend code at all.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:8787";

export const startTierCheckout = async (uid, tier) => {
  const res = await fetch(`${SERVER_URL}/api/stripe/create-checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, tier }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Could not start checkout");
  }
  const { url } = await res.json();
  window.location.href = url;
};

// ---------- uploaded content ----------
// status: "pending" | "approved" | "rejected" (human decision)
// moderationStatus: "pending_scan" | "flagged" | "clear" (automated decision,
// written exclusively by the server after Cloudinary's moderation add-on
// finishes scanning - see server/moderationWebhook.js. The client always
// starts this at "pending_scan"; Firestore rules block it from ever being
// set to anything else by a direct client write.)
export const submitUpload = async (uid, { title, description, category, cloudinaryUrl, cloudinaryPublicId, durationSeconds }) => {
  const ref = await addDoc(collection(db, "uploads"), {
    uid,
    title,
    description,
    category,
    cloudinaryUrl,
    cloudinaryPublicId,
    durationSeconds,
    status: "pending",
    moderationStatus: "pending_scan",
    createdAt: serverTimestamp(),
    views: 0,
  });
  await updateDoc(doc(db, "users", uid), { uploadsThisMonth: (await getUserProfile(uid))?.uploadsThisMonth + 1 || 1 });
  return ref.id;
};

export const getApprovedUploads = async () => {
  // Public feed only ever shows content that's both human-approved AND
  // passed the automated scan - mirrors the read rule in firestore.rules.
  const q = query(
    collection(db, "uploads"),
    where("status", "==", "approved"),
    where("moderationStatus", "==", "clear"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getUploadsForUser = async (uid) => {
  const q = query(collection(db, "uploads"), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getPendingUploads = async () => {
  // Only show moderators content that's either already cleared the
  // automated scan or hasn't been scanned yet - anything the scanner
  // already flagged gets auto-rejected before it reaches a human (see
  // server/moderationWebhook.js), so it's intentionally excluded here to
  // avoid wasting a moderator's time re-reviewing what was already caught.
  const q = query(
    collection(db, "uploads"),
    where("status", "==", "pending"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((u) => u.moderationStatus !== "flagged");
};

export const reviewUpload = (uploadId, decision, reviewerUid) =>
  updateDoc(doc(db, "uploads", uploadId), { status: decision, reviewedAt: serverTimestamp(), reviewedBy: reviewerUid });

export const deleteUpload = (uploadId) => deleteDoc(doc(db, "uploads", uploadId));

// ---------- reports (user-flagged content) ----------
export const reportUpload = (uploadId, reportedBy, reason) =>
  addDoc(collection(db, "reports"), {
    uploadId,
    reportedBy,
    reason,
    status: "open",
    createdAt: serverTimestamp(),
  });

export const getOpenReports = async () => {
  const q = query(collection(db, "reports"), where("status", "==", "open"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const resolveReport = (reportId, resolution) =>
  updateDoc(doc(db, "reports", reportId), { status: resolution, resolvedAt: serverTimestamp() });

// ---------- moderator: suspend/unsuspend a user ----------
export const setUserSuspended = (uid, suspended) => updateDoc(doc(db, "users", uid), { suspended });

export const setUserRole = (uid, role) => updateDoc(doc(db, "users", uid), { role });
