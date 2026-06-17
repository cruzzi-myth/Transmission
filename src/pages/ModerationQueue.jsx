import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { getPendingUploads, reviewUpload } from "../utils/firebase";
import "./ModerationQueue.css";

export default function ModerationQueue() {
  const { user, profile, loading: authLoading } = useAuth();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const isModerator = profile?.role === "moderator" || profile?.role === "admin";

  const refresh = useCallback(async () => {
    try {
      const data = await getPendingUploads();
      setPending(data);
      setLoadError(false);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load moderation queue:", err);
      setLoadError(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isModerator) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh(); // async - all setState calls inside happen after awaits
  }, [isModerator, refresh]);

  const handleReview = async (id, decision) => {
    await reviewUpload(id, decision, user.uid);
    setPending((prev) => prev.filter((p) => p.id !== id));
  };

  if (authLoading) return null;

  if (!isModerator) {
    return (
      <div className="tx-mod-page">
        <Navbar />
        <div className="tx-mod-content">
          <h1>Moderation queue</h1>
          <p className="tx-mod-denied">
            This area is restricted to moderators. If you think you should have access, ask an admin to set your
            account's role to "moderator" in Firestore (see README for how).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tx-mod-page">
      <Navbar />
      <div className="tx-mod-content">
        <h1>Moderation queue</h1>
        <p className="tx-mod-sub">Reviewing as {profile.name} ({profile.role})</p>

        {loading && <p className="tx-mod-empty">Loading...</p>}
        {loadError && (
          <p className="tx-mod-empty">Couldn't load the queue right now. <span onClick={() => { setLoading(true); setLoadError(false); refresh(); }} style={{ cursor: "pointer", textDecoration: "underline" }}>Try again</span>.</p>
        )}
        {!loading && !loadError && pending.length === 0 && <p className="tx-mod-empty">Nothing waiting on review.</p>}

        <div className="tx-mod-list">
          {pending.map((p) => (
            <div key={p.id} className="tx-mod-row">
              <video src={p.cloudinaryUrl} className="tx-mod-row__preview" controls />
              <div className="tx-mod-row__info">
                <p className="tx-mod-row__title">{p.title}</p>
                <p className="tx-mod-row__desc">{p.description}</p>
                <p className="tx-mod-row__meta">{p.category}</p>
              </div>
              <div className="tx-mod-row__actions">
                <button className="tx-btn tx-btn--signal" onClick={() => handleReview(p.id, "approved")}>
                  Approve
                </button>
                <button className="tx-btn tx-btn--ghost" onClick={() => handleReview(p.id, "rejected")}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
