import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { setUserTier, TIERS } from "../utils/firebase";
import "./Tiers.css";

const TIER_COPY = {
  free: { price: "$0", tagline: "Browse and try uploading" },
  plus: { price: "$6/mo", tagline: "For regular creators" },
  pro: { price: "$15/mo", tagline: "For full-time creators" },
};

export default function Tiers() {
  const { user, profile, refreshProfile } = useAuth();
  const currentTier = profile?.tier || "free";

  const handleSelect = async (tierKey) => {
    if (!user || tierKey === currentTier) return;
    // NOTE: this just writes the tier directly to Firestore - there's no
    // actual payment processor wired up. A real version of this screen
    // would call Stripe (or similar) first and only set the tier once
    // payment succeeds, likely via a webhook rather than client-side.
    await setUserTier(user.uid, tierKey);
    await refreshProfile();
  };

  return (
    <div className="tx-tiers-page">
      <Navbar />
      <div className="tx-tiers-content">
        <h1>Plans</h1>
        <p className="tx-tiers-sub">
          Demo only - selecting a tier updates your account instantly, no real payment is processed.
        </p>

        <div className="tx-tiers-grid">
          {Object.entries(TIERS).map(([key, tier]) => (
            <div key={key} className={`tx-tier-card ${currentTier === key ? "tx-tier-card--active" : ""}`}>
              <h2>{tier.label}</h2>
              <p className="tx-tier-price">{TIER_COPY[key].price}</p>
              <p className="tx-tier-tagline">{TIER_COPY[key].tagline}</p>
              <ul>
                <li>{tier.uploadLimitPerMonth === Infinity ? "Unlimited" : tier.uploadLimitPerMonth} uploads / month</li>
                <li>Up to {tier.maxResolution}</li>
                <li>Connect up to {tier.connectedServices} services</li>
              </ul>
              <button
                className={`tx-btn ${currentTier === key ? "tx-btn--ghost" : "tx-btn--ember"}`}
                onClick={() => handleSelect(key)}
                disabled={currentTier === key}
              >
                {currentTier === key ? "Current plan" : "Switch to " + tier.label}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
