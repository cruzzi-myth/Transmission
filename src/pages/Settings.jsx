import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { resendVerificationEmail, deleteOwnAccount } from "../utils/firebase";
import "./Settings.css";

export default function Settings() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [verifySent, setVerifySent] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleResendVerification = async () => {
    await resendVerificationEmail();
    setVerifySent(true);
  };

  const canDelete = confirmText.trim().toUpperCase() === "DELETE" && password.length > 0;

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!canDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteOwnAccount(password);
      navigate("/login", { replace: true });
    } catch (err) {
      // Wrong password is the most likely failure here - surface that
      // plainly rather than a generic Firebase error string.
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setDeleteError("That password isn't correct.");
      } else {
        setDeleteError(err.message.replace("Firebase: ", ""));
      }
      setDeleting(false);
    }
  };

  return (
    <div className="tx-settings-page">
      <Navbar />
      <div className="tx-settings-content">
        <h1>Account settings</h1>

        <section className="tx-settings-section">
          <h2>Email verification</h2>
          {user?.emailVerified ? (
            <p className="tx-settings-status tx-settings-status--ok">✓ {user.email} is verified.</p>
          ) : (
            <>
              <p className="tx-settings-status">
                {user?.email} hasn't been verified yet. Verifying helps us reach you about your account and confirms
                you own this address.
              </p>
              {verifySent ? (
                <p className="tx-settings-status tx-settings-status--ok">
                  Verification email sent — check your inbox.
                </p>
              ) : (
                <button className="tx-btn tx-btn--signal" onClick={handleResendVerification}>
                  Send verification email
                </button>
              )}
            </>
          )}
        </section>

        <section className="tx-settings-section">
          <h2>Plan</h2>
          <p className="tx-settings-status">
            You're on the {profile?.tier || "free"} tier. Manage upgrades or cancellation from{" "}
            <a href="/tiers">the Plans page</a>.
          </p>
        </section>

        <section className="tx-settings-section tx-settings-section--danger">
          <h2>Delete account</h2>
          <p className="tx-settings-status">
            This permanently deletes your profile and login. It does not currently delete your past uploads or
            their video files (see README "Account deletion" for why, and what a full implementation would need to
            also clean up).
          </p>

          {!showDeleteForm ? (
            <button className="tx-btn tx-btn--ghost" onClick={() => setShowDeleteForm(true)}>
              Delete my account
            </button>
          ) : (
            <form onSubmit={handleDelete} className="tx-settings-delete-form">
              <label>
                Type DELETE to confirm
                <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
              </label>
              <label>
                Re-enter your password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              {deleteError && <p className="tx-login-error">{deleteError}</p>}
              <div className="tx-settings-delete-actions">
                <button type="submit" className="tx-btn tx-btn--ember" disabled={!canDelete || deleting}>
                  {deleting ? "Deleting..." : "Permanently delete account"}
                </button>
                <button type="button" className="tx-btn tx-btn--ghost" onClick={() => setShowDeleteForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
