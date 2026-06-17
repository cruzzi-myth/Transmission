import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
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
    role: "member",
    tier: "free",
    uploadsThisMonth: 0,
    bio: "",
  });
  return cred.user;
};

export const loginUser = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);
export const subscribeToAuthChanges = (cb) => onAuthStateChanged(auth, cb);

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
};

export const updateUserProfile = (uid, data) => updateDoc(doc(db, "users", uid), data);

export const setUserTier = (uid, tier) => updateDoc(doc(db, "users", uid), { tier });
export const setUserRole = (uid, role) => updateDoc(doc(db, "users", uid), { role });

// ---------- uploaded content ----------
// status: "pending" | "approved" | "rejected"
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
    createdAt: serverTimestamp(),
    views: 0,
  });
  await updateDoc(doc(db, "users", uid), { uploadsThisMonth: (await getUserProfile(uid))?.uploadsThisMonth + 1 || 1 });
  return ref.id;
};

export const getApprovedUploads = async () => {
  const q = query(collection(db, "uploads"), where("status", "==", "approved"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getUploadsForUser = async (uid) => {
  const q = query(collection(db, "uploads"), where("uid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getPendingUploads = async () => {
  const q = query(collection(db, "uploads"), where("status", "==", "pending"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const reviewUpload = (uploadId, decision) =>
  updateDoc(doc(db, "uploads", uploadId), { status: decision, reviewedAt: serverTimestamp() });

export const deleteUpload = (uploadId) => deleteDoc(doc(db, "uploads", uploadId));
