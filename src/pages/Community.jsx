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

  useEffect(() => {
    getApprovedUploads().then(setUploads);
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
        {filtered.map((u) => (
          <Link key={u.id} to={`/watch/upload/${u.id}`} className="tx-community-card">
            <div className="tx-community-card__media">
              {u.thumbnailUrl ? <img src={u.thumbnailUrl} alt={u.title} /> : <video src={u.cloudinaryUrl} muted />}
            </div>
            <p className="tx-community-card__title">{u.title}</p>
            <p className="tx-community-card__meta">{u.category} · {u.views || 0} views</p>
          </Link>
        ))}
        {filtered.length === 0 && <p className="tx-community-empty">Nothing in this category yet.</p>}
      </div>
    </div>
  );
}
