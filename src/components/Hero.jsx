import { useNavigate } from "react-router-dom";
import "./Hero.css";

// Signature element: a horizontal "signal scan" sweep across the hero,
// reinforcing the broadcast/transmission concept without scattering motion
// everywhere else on the page.
export default function Hero({ featured }) {
  const navigate = useNavigate();
  if (!featured) return null;

  return (
    <div className="tx-hero">
      <div
        className="tx-hero__bg"
        style={{ backgroundImage: `url(${featured.backdrop})` }}
      />
      <div className="tx-hero__scan" />
      <div className="tx-hero__overlay" />
      <div className="tx-hero__content">
        <span className="tx-hero__eyebrow">
          {featured.isUpload ? "FROM AN INDEPENDENT CREATOR" : "TRENDING NOW"}
        </span>
        <h1 className="tx-hero__title">{featured.title}</h1>
        <p className="tx-hero__desc">{featured.description}</p>
        <div className="tx-hero__actions">
          <button className="tx-btn tx-btn--ember" onClick={() => navigate(featured.watchPath)}>
            Watch now
          </button>
          <button className="tx-btn tx-btn--ghost" onClick={() => navigate(featured.infoPath)}>
            More info
          </button>
        </div>
      </div>
    </div>
  );
}
