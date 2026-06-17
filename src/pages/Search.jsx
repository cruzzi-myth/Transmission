import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { searchMulti, IMG_BASE_W500 } from "../utils/tmdb";
import "./Search.css";

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (q) searchMulti(q).then(setResults);
  }, [q]);

  return (
    <div className="tx-search-page">
      <Navbar />
      <div className="tx-search-content">
        <h2>Results for "{q}"</h2>
        <div className="tx-search-grid">
          {results.filter((r) => r.poster_path).map((r) => (
            <Link key={r.id} to={`/watch/tmdb/${r.id}`} className="tx-search-card">
              <img src={`${IMG_BASE_W500}${r.poster_path}`} alt={r.title || r.name} />
              <p>{r.title || r.name}</p>
            </Link>
          ))}
        </div>
        {results.length === 0 && <p className="tx-search-empty">No matches found.</p>}
      </div>
    </div>
  );
}
