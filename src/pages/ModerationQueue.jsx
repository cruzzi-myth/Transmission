import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { getPendingUploads, reviewUpload } from "../utils/firebase";
import "./ModerationQueue.css";

export default function ModerationQueue() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = () => {
    setLoading(true);
    getPendingUploads().then((data) => {
      setPending(data);
      setLoading(false);
    });
  };

  const handleReview = async (id, decision) => {
    await reviewUpload(id, decision);
    setPending((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="tx-mod-page">
      <Navbar />
      <div className="tx-mod-content">
        <h1>Moderation queue</h1>


        {loading && <p className="tx-mod-empty">Loading...</p>}
        {!loading && pending.length === 0 && <p className="tx-mod-empty">Nothing waiting on review.</p>}

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
