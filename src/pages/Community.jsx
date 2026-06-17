import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getApprovedUploads } from "../utils/firebase";
import "./Community.css";

const CATEGORIES = ["All", "Short film", "Documentary", "Series episode", "Music video", "Vlog", "Tutorial", "Other"];

export default function Community() {
  const [uploads, setUploads] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("recent"); // recent | views
  const [loadState, setLoadState] = useState("loading"); // loading | loaded | error

  useEffect(() => {
    getApprovedUploads()
      .then((data) => {
        setUploads(data);
        setLoadState("loaded");
      })
      .catch((err) => {
        console.error("Failed to load community uploads:", err);
        setLoadState("error");
      });
  }, []);

  const filtered = uploads
    .filter((u) => activeCategory === "All" || u.category === activeCategory)
    .sort((a, b) => (sortBy === "views" ? (b.views || 0) - (a.views || 0) : 0)); // createdAt desc already from query

  return (
    <div className="tx-community-page">
      <Navbar />
      <div className="tx-community-hero">
        <span className="tx-community-eyebrow">COMMUNITY</span>
        <h1>Independent creators, broadcasting direct</h1>
        <p>Every title here was uploaded by a member of this platform and approved against our content guidelines.</p>
        <Link to="/upload" className="tx-btn tx-btn--ember">
          Upload your own
        </Link>
      </div>

      <div className="tx-community-controls">
        <div className="tx-community-chips">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`tx-chip ${activeCategory === c ? "tx-chip--active" : ""}`}
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="tx-community-sort">
          <button className={sortBy === "recent" ? "active" : ""} onClick={() => setSortBy("recent")}>
            Newest
          </button>
          <button className={sortBy === "views" ? "active" : ""} onClick={() => setSortBy("views")}>
            Most viewed
          </button>
        </div>
      </div>

      <div className="tx-community-grid">
        {loadState === "loading" && <p className="tx-community-empty">Loading...</p>}
        {loadState === "error" && (
          <p className="tx-community-empty">
            Couldn't load content right now. Check your connection and refresh the page.
          </p>
        )}
        {loadState === "loaded" &&
          filtered.map((u) => (
            <Link key={u.id} to={`/watch/upload/${u.id}`} className="tx-community-card">
              <div className="tx-community-card__media">
                {u.thumbnailUrl ? <img src={u.thumbnailUrl} alt={u.title} /> : <video src={u.cloudinaryUrl} muted />}
              </div>
              <p className="tx-community-card__title">{u.title}</p>
              <p className="tx-community-card__meta">{u.category} · {u.views || 0} views</p>
            </Link>
          ))}
        {loadState === "loaded" && filtered.length === 0 && uploads.length === 0 && (
          <p className="tx-community-empty">
            No content has been approved yet. Be the first — <a href="/upload">upload something</a>.
          </p>
        )}
        {loadState === "loaded" && filtered.length === 0 && uploads.length > 0 && (
          <p className="tx-community-empty">Nothing in this category yet. Try a different filter.</p>
        )}
      </div>
    </div>
  );
}
