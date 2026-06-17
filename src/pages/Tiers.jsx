import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { startTierCheckout, TIERS } from "../utils/firebase";
import "./Tiers.css";

const TIER_COPY = {
  free: { price: "$0", tagline: "Browse and try uploading" },
  plus: { price: "$6/mo", tagline: "For regular creators" },
  pro: { price: "$15/mo", tagline: "For full-time creators" },
};

export default function Tiers() {
  const { user, profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [loadingTier, setLoadingTier] = useState(null);
  const [error, setError] = useState("");
  const currentTier = profile?.tier || "free";
  const checkoutResult = searchParams.get("checkout");

  // Stripe redirects back here after checkout. On success the webhook may
  // take a couple seconds to land before Firestore reflects the new tier,
  // so we refresh the profile once on arrival and again after a short delay
  // as a simple way to pick up the change without building a realtime
  // listener just for this one page.
  useEffect(() => {
    if (checkoutResult === "success") {
      refreshProfile();
      const t = setTimeout(refreshProfile, 3000);
      return () => clearTimeout(t);
    }
  }, [checkoutResult, refreshProfile]);

  const handleSelect = async (tierKey) => {
    if (!user || tierKey === currentTier) return;
    if (tierKey === "free") return; // downgrading to free happens via Stripe portal/cancellation, not here
    setError("");
    setLoadingTier(tierKey);
    try {
      await startTierCheckout(user.uid, tierKey);
      // startTierCheckout redirects the page on success, so we normally
      // never reach the next line - it only runs if something went wrong
      // before the redirect happened.
    } catch (err) {
      setError(err.message);
      setLoadingTier(null);
    }
  };

  return (
    <div className="tx-tiers-page">
      <Navbar />
      <div className="tx-tiers-content">
        <h1>Plans</h1>
        <p className="tx-tiers-sub">
          Upgrades are processed securely through Stripe. You'll be redirected to complete payment, and your plan
          updates automatically once it's confirmed.
        </p>

        {checkoutResult === "success" && (
          <div className="tx-tiers-banner tx-tiers-banner--success">
            Payment confirmed — your plan is updating now. If it doesn't reflect within a minute, refresh this page.
          </div>
        )}
        {checkoutResult === "cancelled" && (
          <div className="tx-tiers-banner tx-tiers-banner--info">Checkout was cancelled. No charge was made.</div>
        )}
        {error && <div className="tx-tiers-banner tx-tiers-banner--error">{error}</div>}

        <div className="tx-tiers-grid">
          {Object.entries(TIERS).map(([key, tier]) => (
            <div key={key} className={`tx-tier-card ${currentTier === key ? "tx-tier-card--active" : ""}`}>
              <h2>{tier.label}</h2>
              <p className="tx-tier-price">{TIER_COPY[key].price}</p>
              <p className="tx-tier-tagline">{TIER_COPY[key].tagline}</p>
              <ul>
                <li>{tier.uploadLimitPerMonth === Infinity ? "Unlimited" : tier.uploadLimitPerMonth} uploads / month</li>
                <li>Up to {tier.maxResolution}</li>
              </ul>
              <button
                className={`tx-btn ${currentTier === key ? "tx-btn--ghost" : "tx-btn--ember"}`}
                onClick={() => handleSelect(key)}
                disabled={currentTier === key || loadingTier !== null || key === "free"}
              >
                {currentTier === key
                  ? "Current plan"
                  : key === "free"
                  ? "Manage in billing portal"
                  : loadingTier === key
                  ? "Redirecting to checkout..."
                  : "Switch to " + tier.label}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
