import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logoutUser, TIERS } from "../utils/firebase";
import "./Navbar.css";

const MOVIE_GENRES = [
  { id: 28, name: "Action" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 27, name: "Horror" },
  { id: 10749, name: "Romance" },
  { id: 99, name: "Documentaries" },
  { id: 16, name: "Animation" },
  { id: 53, name: "Thrillers" },
];

const TV_GENRES = [
  { id: 18, name: "Drama" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 10759, name: "Action & Adventure" },
  { id: 99, name: "Documentary" },
  { id: 16, name: "Animation" },
  { id: 9648, name: "Mystery" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const tier = TIERS[profile?.tier || "free"];
  const isModerator = profile?.role === "moderator" || profile?.role === "admin";

  return (
    <nav className={`tx-nav ${scrolled ? "tx-nav--scrolled" : ""}`}>
      <div className="tx-nav__left">
        <Link to="/" className="tx-nav__logo">
          <span className="tx-nav__logo-mark" />
          TRANSMISSION
        </Link>
        <div className="tx-nav__links">
          <div className="tx-nav__menu-item">
            <Link to="/">Feed</Link>
            <div className="tx-nav__submenu">
              <div className="tx-nav__submenu-item">
                <span>Movies</span>
                <span className="tx-nav__submenu-arrow">›</span>
                <div className="tx-nav__submenu2">
                  {MOVIE_GENRES.map((g) => (
                    <Link key={g.id} to={`/browse/movie/${g.id}?name=${encodeURIComponent(g.name)}`}>
                      {g.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="tx-nav__submenu-item">
                <span>Shows</span>
                <span className="tx-nav__submenu-arrow">›</span>
                <div className="tx-nav__submenu2">
                  {TV_GENRES.map((g) => (
                    <Link key={g.id} to={`/browse/tv/${g.id}?name=${encodeURIComponent(g.name)}`}>
                      {g.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <Link to="/community">Community</Link>
          <Link to="/upload">Upload</Link>
          <Link to="/studio">My Studio</Link>
        </div>
      </div>
      <div className="tx-nav__right">
        <form onSubmit={handleSearch} className="tx-nav__search">
          <input placeholder="Search titles, creators..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </form>
        <Link to="/tiers" className="tx-nav__tier-badge">
          {tier.label}
        </Link>
        <div className="tx-nav__profile">
          <div className="tx-nav__avatar">{profile?.name?.[0]?.toUpperCase() || "?"}</div>
          <div className="tx-nav__dropdown">
            <Link to="/studio">My Studio</Link>
            <Link to="/tiers">Manage plan</Link>
            <Link to="/settings">Account settings</Link>
            {isModerator && <Link to="/moderation">Moderation queue</Link>}
            {isModerator && <Link to="/reports">User reports</Link>}
            <span onClick={logoutUser}>Sign out</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
