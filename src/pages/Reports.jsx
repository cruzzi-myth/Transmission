import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { getOpenReports, resolveReport, deleteUpload, setUserSuspended } from "../utils/firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import "./ModerationQueue.css";

export default function Reports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const isModerator = profile?.role === "moderator" || profile?.role === "admin";

  const refresh = useCallback(async () => {
    const openReports = await getOpenReports();
    // Each report only stores an uploadId - pull the upload's own details
    // (title, uploader) so the moderator has context without needing to
    // cross-reference manually.
    const withUploadInfo = await Promise.all(
      openReports.map(async (r) => {
        const uploadSnap = await getDoc(doc(db, "uploads", r.uploadId));
        return { ...r, upload: uploadSnap.exists() ? uploadSnap.data() : null };
      })
    );
    setReports(withUploadInfo);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isModerator) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh(); // async - all setState calls inside happen after awaits
  }, [isModerator, refresh]);

  const handleDismiss = async (reportId) => {
    await resolveReport(reportId, "dismissed");
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  // Takes the content down (deletes the upload doc) and resolves the
  // report. Does NOT automatically suspend the uploader - that's a
  // separate, heavier action a moderator should take deliberately, not as
  // an automatic side effect of one report being upheld.
  const handleTakeDown = async (report) => {
    await deleteUpload(report.uploadId);
    await resolveReport(report.id, "upheld");
    setReports((prev) => prev.filter((r) => r.id !== report.id));
  };

  const handleSuspendUploader = async (report) => {
    if (!report.upload?.uid) return;
    await setUserSuspended(report.upload.uid, true);
  };

  if (!isModerator && !loading) {
    return (
      <div className="tx-mod-page">
        <Navbar />
        <div className="tx-mod-content">
          <h1>Reports</h1>
          <p className="tx-mod-denied">This area is restricted to moderators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tx-mod-page">
      <Navbar />
      <div className="tx-mod-content">
        <h1>User reports</h1>
        <p className="tx-mod-sub">Content flagged by members for review, separate from the upload queue.</p>

        {loading && <p className="tx-mod-empty">Loading...</p>}
        {!loading && reports.length === 0 && <p className="tx-mod-empty">No open reports.</p>}

        <div className="tx-mod-list">
          {reports.map((r) => (
            <div key={r.id} className="tx-mod-row" style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="tx-mod-row__info">
                <p className="tx-mod-row__title">{r.upload?.title || "(content no longer exists)"}</p>
                <p className="tx-mod-row__desc">Reported reason: {r.reason}</p>
                <p className="tx-mod-row__meta">Reported by user {r.reportedBy}</p>
              </div>
              <div className="tx-mod-row__actions">
                <button className="tx-btn tx-btn--ember" onClick={() => handleTakeDown(r)}>
                  Take down content
                </button>
                <button className="tx-btn tx-btn--ghost" onClick={() => handleSuspendUploader(r)}>
                  Suspend uploader
                </button>
                <button className="tx-btn tx-btn--ghost" onClick={() => handleDismiss(r.id)}>
                  Dismiss report
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
