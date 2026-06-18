import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getByGenre, IMG_BASE_W500 } from "../utils/tmdb";
import "./Browse.css";

export default function Browse() {
  const { type, genreId } = useParams();
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name") || "Browse";
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems([]);
    getByGenre(genreId, type).then((data) => {
      setItems(
        data
          .filter((m) => m.poster_path)
          .map((m) => ({
            id: m.id,
            title: m.title || m.name,
            image: `${IMG_BASE_W500}${m.poster_path}`,
            watchPath: `/watch/tmdb/${m.id}`,
          }))
      );
    });
  }, [type, genreId]);

  return (
    <div className="tx-browse">
      <Navbar />
      <div className="tx-browse__content">
        <h1 className="tx-browse__title">{name}</h1>
        <div className="tx-browse__grid">
          {items.map((item) => (
            <Link to={item.watchPath} key={item.id} className="tx-browse__card">
              <img src={item.image} alt={item.title} loading="lazy" />
              <p>{item.title}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
