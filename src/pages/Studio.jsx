import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { getUploadsForUser, deleteUpload } from "../utils/firebase";
import "./Studio.css";

const STATUS_LABEL = {
  pending: "In review",
  approved: "Live",
  rejected: "Not approved",
};

export default function Studio() {
  const { user } = useAuth();
  const [uploads, setUploads] = useState([]);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (user) getUploadsForUser(user.uid).then(setUploads);
  }, [user]);

  const handleDelete = async (uploadId) => {
    if (!window.confirm("Remove this upload? This cannot be undone.")) return;
    setDeleting(uploadId);
    try {
      await deleteUpload(uploadId);
      setUploads((prev) => prev.filter((u) => u.id !== uploadId));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="tx-studio-page">
      <Navbar />
      <div className="tx-studio-content">
        <h1>My Studio</h1>
        <p className="tx-studio-sub">Everything you've uploaded and its review status.</p>

        {uploads.length === 0 ? (
          <p className="tx-studio-empty">
            Nothing uploaded yet. <a href="/upload">Upload your first piece</a>.
          </p>
        ) : (
          <div className="tx-studio-list">
            {uploads.map((u) => (
              <div key={u.id} className="tx-studio-row">
                <div>
                  <p className="tx-studio-row__title">{u.title}</p>
                  <p className="tx-studio-row__meta">{u.category} · {u.views || 0} views</p>
                </div>
                <div className="tx-studio-row__actions">
                  <span className={`tx-studio-status tx-studio-status--${u.status}`}>
                    {STATUS_LABEL[u.status] || u.status}
                  </span>
                  <button
                    className="tx-studio-delete"
                    onClick={() => handleDelete(u.id)}
                    disabled={deleting === u.id}
                  >
                    {deleting === u.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
