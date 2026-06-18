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
  await sendEmailVerification(cred.user).catch((err) =>
    console.warn("Could not send verification email:", err.message)
  );
  return cred.user;
};

export const loginUser = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);
export const subscribeToAuthChanges = (cb) => onAuthStateChanged(auth, cb);

export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim().toLowerCase());

export const resendVerificationEmail = () => {
  if (!auth.currentUser) throw new Error("Not signed in");
  return sendEmailVerification(auth.currentUser);
};

export const deleteOwnAccount = async (password) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  // Delete Firestore profile before Auth account — if reversed, a failed
  // Firestore delete would leave an orphaned doc the user can never clean up.
  await deleteDoc(doc(db, "users", user.uid));
  await deleteUser(user);
};

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};

export const updateUserProfile = (uid, data) => updateDoc(doc(db, "users", uid), data);

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

export const setUserSuspended = (uid, suspended) => updateDoc(doc(db, "users", uid), { suspended });

export const setUserRole = (uid, role) => updateDoc(doc(db, "users", uid), { role });
