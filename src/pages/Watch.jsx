import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import Navbar from "../components/Navbar";
import { getMovieDetails } from "../utils/tmdb";
import { db, reportUpload } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";
import "./Watch.css";

const REPORT_REASONS = [
  "Copyright infringement",
  "Hate speech or harassment",
  "Content endangering minors",
  "Spam or scam",
  "Something else",
];

export default function Watch() {
  const { source, id } = useParams(); // source = "tmdb" | "upload"
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState({ data: null, notFound: false, forKey: null });
  const currentKey = `${source}/${id}`;
  const viewIsStale = view.forKey !== currentKey;
  const data = viewIsStale ? null : view.data;
  const notFound = viewIsStale ? false : view.notFound;

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportStatus, setReportStatus] = useState("idle"); // idle | sending | sent | error

  useEffect(() => {
    let cancelled = false;
    const key = `${source}/${id}`;

    if (source === "tmdb") {
      getMovieDetails(id)
        .then((d) => {
          if (!cancelled) setView({ data: d || null, notFound: !d, forKey: key });
        })
        .catch(() => {
          if (!cancelled) setView({ data: null, notFound: true, forKey: key });
        });
    } else if (source === "upload") {
      getDoc(doc(db, "uploads", id)).then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          setView({ data: { ...snap.data(), id: snap.id, isUpload: true }, notFound: false, forKey: key });
          // best-effort view increment, fine if this occasionally double-counts on refresh
          updateDoc(doc(db, "uploads", id), { views: increment(1) }).catch(() => {});
        } else {
          setView({ data: null, notFound: true, forKey: key });
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [source, id]);

  const trailer = data?.videos?.results?.find((v) => v.type === "Trailer" && v.site === "YouTube");

  const handleSubmitReport = async () => {
    if (!user) return;
    setReportStatus("sending");
    try {
      await reportUpload(id, user.uid, reportReason);
      setReportStatus("sent");
    } catch (err) {
      console.error("Failed to submit report:", err);
      setReportStatus("error");
    }
  };

  if (notFound) {
    return (
      <div className="tx-watch-page">
        <Navbar />
        <button className="tx-watch-back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="tx-watch-info" style={{ paddingTop: "140px" }}>
          <h2>This title isn't available</h2>
          <p>
            It may have been removed, rejected during review, or the link might be broken. Head back to{" "}
            <a href="/community">Community</a> or <a href="/">the feed</a> to keep browsing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tx-watch-page">
      <Navbar />
      <button className="tx-watch-back" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="tx-watch-player">
        {!data && <div className="tx-watch-noplayer">Loading...</div>}
        {data?.isUpload && data.cloudinaryUrl && (
          <video src={data.cloudinaryUrl} controls autoPlay className="tx-watch-video" />
        )}
        {data && !data.isUpload && trailer && (
          <iframe
            title="player"
            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        )}
        {data && !data.isUpload && !trailer && (
          <div className="tx-watch-noplayer">No trailer available for this title.</div>
        )}
      </div>

      {data && (
        <div className="tx-watch-info">
          <h2>{data.title || data.name}</h2>
          <p>{data.overview || data.description}</p>
          {data.isUpload && (
            <>
              <p className="tx-watch-views">
                {data.views || 0} views · {data.category}
              </p>

              {!showReportForm && reportStatus !== "sent" && (
                <button className="tx-btn tx-btn--ghost" onClick={() => setShowReportForm(true)}>
                  Report this content
                </button>
              )}

              {reportStatus === "sent" && (
                <p className="tx-watch-views" style={{ color: "var(--signal)" }}>
                  Thanks — this has been sent to our moderation team for review.
                </p>
              )}

              {showReportForm && reportStatus !== "sent" && (
                <div style={{ marginTop: "var(--space-3)", maxWidth: "360px" }}>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    style={{ width: "100%", marginBottom: "var(--space-2)" }}
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button
                      className="tx-btn tx-btn--ember"
                      onClick={handleSubmitReport}
                      disabled={reportStatus === "sending"}
                    >
                      {reportStatus === "sending" ? "Sending..." : "Submit report"}
                    </button>
                    <button className="tx-btn tx-btn--ghost" onClick={() => setShowReportForm(false)}>
                      Cancel
                    </button>
                  </div>
                  {reportStatus === "error" && (
                    <p className="tx-login-error">Something went wrong sending that. Try again.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
