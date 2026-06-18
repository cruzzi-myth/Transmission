import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import ContentRow from "../components/ContentRow";
import { getTrending, getByGenre, IMG_BASE } from "../utils/tmdb";
import { getApprovedUploads, cloudinaryThumbnail, TIERS } from "../utils/firebase";
import { fetchYouTubeCategory } from "../utils/youtube";
import { useAuth } from "../context/AuthContext";
import "./Home.css";

const GENRE_ROWS = [
  { id: 28, name: "Action" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 27, name: "Horror" },
  { id: 10749, name: "Romance" },
  { id: 99, name: "Documentaries" },
  { id: 16, name: "Animation" },
  { id: 53, name: "Thrillers" },
];

const normalize = (m) => ({
  id: `tmdb-${m.id}`,
  title: m.title || m.name,
  image: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
  backdrop: `${IMG_BASE}${m.backdrop_path}`,
  description: m.overview,
  isUpload: false,
  watchPath: `/watch/tmdb/${m.id}`,
  infoPath: `/watch/tmdb/${m.id}`,
});

export default function Home() {
  const { profile } = useAuth();
  const [trending, setTrending] = useState([]);
  const [genreRows, setGenreRows] = useState({});
  const [uploads, setUploads] = useState([]);
  const [musicVideos, setMusicVideos] = useState([]);
  const [featured, setFeatured] = useState(null);

  const tier = TIERS[profile?.tier || "free"];
  const visibleGenres = GENRE_ROWS.slice(0, tier.catalogRowCap);

  useEffect(() => {
    getTrending().then((data) => {
      const normalized = data.filter((m) => m.backdrop_path && m.poster_path).map(normalize);
      setTrending(normalized);
      if (normalized.length) setFeatured(normalized[Math.floor(Math.random() * Math.min(normalized.length, 10))]);
    });

    visibleGenres.forEach((g) => {
      getByGenre(g.id).then((data) =>
        setGenreRows((prev) => ({ ...prev, [g.id]: data.filter((m) => m.poster_path).map(normalize) }))
      );
    });

    getApprovedUploads().then((data) => {
      setUploads(
        data.map((u) => ({
          id: `upload-${u.id}`,
          title: u.title,
          image: u.thumbnailUrl || cloudinaryThumbnail(u.cloudinaryUrl) || "/upload-placeholder.svg",
          isUpload: true,
          creatorName: u.creatorName,
          watchPath: `/watch/upload/${u.id}`,
          infoPath: `/watch/upload/${u.id}`,
        }))
      );
    });

    fetchYouTubeCategory("music")
      .then(setMusicVideos)
      .catch((err) => console.error("YouTube fetch failed:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier.catalogRowCap]);

  return (
    <div className="tx-home">
      <Navbar />
      <Hero featured={featured} />
      <div className="tx-home__rows">
        {uploads.length > 0 && <ContentRow title="From independent creators" items={uploads} />}
        {musicVideos.length > 0 && <ContentRow title="Music Videos" items={musicVideos} />}
        <ContentRow title="Trending now" items={trending} />
        {visibleGenres.map((g) => <ContentRow key={g.id} title={g.name} items={genreRows[g.id]} />)}

        {tier.catalogAccess === "limited" && (
          <div className="tx-home__upsell">
            <p>
              You're seeing a limited catalog on the Free tier. <Link to="/tiers">Upgrade to Plus or Pro</Link> to
              unlock the full library.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}