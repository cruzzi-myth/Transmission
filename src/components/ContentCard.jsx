import { useNavigate } from "react-router-dom";
import "./ContentCard.css";

// works for both TMDB titles and creator uploads - normalized shape:
// { id, title, image, isUpload, watchPath, creatorName }
export default function ContentCard({ item }) {
  const navigate = useNavigate();
  if (!item.image) return null;

  return (
    <div className="tx-card" onClick={() => navigate(item.watchPath)}>
      <div className="tx-card__media">
        <img src={item.image} alt={item.title} loading="lazy" />
        {item.isUpload && <span className="tx-card__badge">CREATOR</span>}
      </div>
      <div className="tx-card__meta">
        <p className="tx-card__title">{item.title}</p>
        {item.creatorName && <p className="tx-card__creator">{item.creatorName}</p>}
      </div>
    </div>
  );
}
