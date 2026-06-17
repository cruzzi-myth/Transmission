import { useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { uploadVideoToCloudinary } from "../utils/cloudinaryUpload";
import { submitUpload, TIERS } from "../utils/firebase";
import "./Upload.css";

const GUIDELINES = [
  "I own this content or have rights to upload it",
  "This does not contain copyrighted music, clips, or footage I don't have rights to",
  "This does not contain hate speech, harassment, or content that endangers minors",
  "This is not spam, scam, or deceptive advertising",
];

const CATEGORIES = ["Short film", "Documentary", "Series episode", "Music video", "Vlog", "Tutorial", "Other"];

export default function Upload() {
  const { user, profile, refreshProfile } = useAuth();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [checked, setChecked] = useState(Array(GUIDELINES.length).fill(false));
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("idle"); // idle | uploading | submitting | done | error
  const [errorMsg, setErrorMsg] = useState("");

  const tier = TIERS[profile?.tier || "free"];
  const uploadsUsed = profile?.uploadsThisMonth || 0;
  const atLimit = uploadsUsed >= tier.uploadLimitPerMonth;
  const allChecked = checked.every(Boolean);
  const canSubmit = file && title.trim() && allChecked && !atLimit && status === "idle";

  const toggleCheck = (i) => {
    const next = [...checked];
    next[i] = !next[i];
    setChecked(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("uploading");
    setErrorMsg("");
    try {
      const result = await uploadVideoToCloudinary(file, setProgress);
      setStatus("submitting");
      await submitUpload(user.uid, {
        title: title.trim(),
        description: description.trim(),
        category,
        cloudinaryUrl: result.url,
        cloudinaryPublicId: result.publicId,
        durationSeconds: result.durationSeconds,
      });
      await refreshProfile();
      setStatus("done");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="tx-upload-page">
        <Navbar />
        <div className="tx-upload-done">
          <h2>Submitted for review</h2>
          <p>
            "{title}" is in the moderation queue. Approved uploads typically show up in the feed within a day.
            You can check status anytime from My Studio.
          </p>
          <a href="/studio" className="tx-btn tx-btn--signal">
            Go to My Studio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="tx-upload-page">
      <Navbar />
      <div className="tx-upload-content">
        <h1>Upload content</h1>
        <p className="tx-upload-sub">
          {tier.label} tier - {tier.maxResolution} max, {uploadsUsed}/{tier.uploadLimitPerMonth === Infinity ? "∞" : tier.uploadLimitPerMonth} uploads used this month
        </p>

        {atLimit && (
          <div className="tx-upload-warning">
            You've hit your monthly upload limit on the {tier.label} tier.{" "}
            <a href="/tiers">Upgrade your plan</a> to upload more.
          </div>
        )}

        <form onSubmit={handleSubmit} className="tx-upload-form">
          <label className="tx-upload-dropzone">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={status !== "idle"}
            />
            {file ? <span>{file.name}</span> : <span>Click to choose a video file</span>}
          </label>

          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={status !== "idle"}
            required
          />

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={status !== "idle"}
            maxLength={500}
          />

          <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={status !== "idle"}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="tx-upload-guidelines">
            <h3>Before you submit</h3>
            {GUIDELINES.map((g, i) => (
              <label key={i} className="tx-upload-check">
                <input type="checkbox" checked={checked[i]} onChange={() => toggleCheck(i)} disabled={status !== "idle"} />
                {g}
              </label>
            ))}
          </div>

          {status === "uploading" && (
            <div className="tx-upload-progress">
              <div className="tx-upload-progress__bar" style={{ width: `${progress}%` }} />
              <span>{progress}%</span>
            </div>
          )}
          {status === "submitting" && <p className="tx-upload-status">Finalizing...</p>}
          {status === "error" && <p className="tx-upload-error">{errorMsg}</p>}

          <button type="submit" className="tx-btn tx-btn--ember" disabled={!canSubmit}>
            {status === "uploading" ? "Uploading..." : status === "submitting" ? "Submitting..." : "Submit for review"}
          </button>
        </form>
      </div>
    </div>
  );
}
