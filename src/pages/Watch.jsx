import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import Navbar from "../components/Navbar";
import { getMovieDetails } from "../utils/tmdb";
import { db } from "../utils/firebase";
import "./Watch.css";

export default function Watch() {
  const { source, id } = useParams(); // source = "tmdb" | "upload"
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (source === "tmdb") {
      getMovieDetails(id).then(setData);
    } else if (source === "upload") {
      getDoc(doc(db, "uploads", id)).then((snap) => {
        if (snap.exists()) {
          setData({ ...snap.data(), isUpload: true });
          // best-effort view increment, fine if this occasionally double-counts on refresh
          updateDoc(doc(db, "uploads", id), { views: increment(1) }).catch(() => {});
        }
      });
    }
  }, [source, id]);

  const trailer = data?.videos?.results?.find((v) => v.type === "Trailer" && v.site === "YouTube");

  return (
    <div className="tx-watch-page">
      <Navbar />
      <button className="tx-watch-back" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="tx-watch-player">
        {data?.isUpload && data.cloudinaryUrl && (
          <video src={data.cloudinaryUrl} controls autoPlay className="tx-watch-video" />
        )}
        {!data?.isUpload && trailer && (
          <iframe
            title="player"
            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1`}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        )}
        {!data?.isUpload && !trailer && <div className="tx-watch-noplayer">No trailer available for this title.</div>}
      </div>

      {data && (
        <div className="tx-watch-info">
          <h2>{data.title || data.name}</h2>
          <p>{data.overview || data.description}</p>
          {data.isUpload && <p className="tx-watch-views">{data.views || 0} views · {data.category}</p>}
        </div>
      )}
    </div>
  );
}
