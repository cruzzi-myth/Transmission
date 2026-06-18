import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getApprovedUploads } from "../utils/firebase";
import "./Community.css";

const CATEGORIES = ["All", "Short film", "Documentary", "Series episode", "Music video", "Vlog", "Tutorial", "Other"];

const STEPS = [
  {
    title: "Upload",
    desc: "Select your video file, add a title, category, and description, then submit.",
  },
  {
    title: "Content scan",
    desc: "Automated safety checks screen the upload for policy violations before it reaches a reviewer.",
  },
  {
    title: "Moderator review",
    desc: "A human moderator watches your video and approves or rejects it against our content guidelines.",
  },
  {
    title: "Goes live",
    desc: "Approved content appears on the Community page, visible to all members of the platform.",
  },
];

const LEGAL = [
  {
    heading: "Content Guidelines",
    items: [
      "You must own the rights to everything you upload — original work only.",
      "No copyrighted material without a clear licence or permission.",
      "No hate speech, harassment, or content targeting individuals.",
      "No content that endangers, exploits, or sexualises minors — zero tolerance.",
      "No spam, scams, or deliberately misleading titles and descriptions.",
      "Repeated violations will result in suspension.",
    ],
  },
  {
    heading: "Privacy Policy",
    items: [
      "We collect your display name, email address, and upload metadata.",
      "Video files are stored via Cloudinary — we do not host them on our own servers.",
      "Authentication and user data are handled by Firebase; see their privacy policy for details.",
      "We do not sell, share, or trade your personal data with third parties.",
      "You can permanently delete your account and all associated data from Account Settings.",
    ],
  },
  {
    heading: "Terms of Service",
    items: [
      "You retain full ownership of all content you upload to the platform.",
      "By uploading you grant Transmission a non-exclusive licence to display your content to members.",
      "We reserve the right to remove any content that violates our guidelines without notice.",
      "Free tier: 2 uploads/month · Plus: 15 uploads/month · Pro: unlimited.",
      "Accounts in repeated or serious violation may be suspended or permanently banned.",
    ],
  },
];

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

      <section className="tx-community-process">
        <span className="tx-community-eyebrow">HOW IT WORKS</span>
        <h2 className="tx-community-process__heading">From upload to live in four steps</h2>
        <div className="tx-community-steps">
          {STEPS.map((step, i) => (
            <div key={i} className="tx-community-step">
              <div className="tx-community-step__dot">
                <span>{i + 1}</span>
              </div>
              <p className="tx-community-step__title">{step.title}</p>
              <p className="tx-community-step__desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

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

      <section className="tx-community-legal">
        <div className="tx-community-legal__inner">
          <span className="tx-community-eyebrow">PLATFORM POLICIES</span>
          <h2 className="tx-community-legal__heading">What you need to know</h2>
          <div className="tx-community-legal__grid">
            {LEGAL.map((block) => (
              <div key={block.heading} className="tx-community-legal__card">
                <h3>{block.heading}</h3>
                <ul>
                  {block.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
