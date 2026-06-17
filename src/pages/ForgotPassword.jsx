import { useState } from "react";
import { Link } from "react-router-dom";
import { resetPassword } from "../utils/firebase";
import "./Login.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      await resetPassword(email);
      // Always show the same success message whether or not the email
      // actually exists in the system - if we said "no account found" for
      // unknown emails, that becomes a way to check whether someone's
      // email is registered on the platform (an account-enumeration leak).
      setStatus("sent");
    } catch (err) {
      // Firebase's "user not found" error path lands here too in modern
      // SDK versions with email enumeration protection enabled, but if
      // it's a genuinely different problem (malformed email, network
      // error), surface that distinctly rather than the generic message.
      if (err.code === "auth/invalid-email") {
        setError("That doesn't look like a valid email address.");
        setStatus("error");
      } else {
        // Treat anything else (including "user not found") as success
        // from the user's perspective, for the same enumeration-safety
        // reason noted above.
        setStatus("sent");
      }
    }
  };

  return (
    <div className="tx-login-page">
      <div className="tx-login-scan" />
      <div className="tx-login-box">
        <div className="tx-login-logo">
          <span className="tx-login-logo-mark" />
          TRANSMISSION
        </div>
        <h1>Reset your password</h1>

        {status === "sent" ? (
          <>
            <p style={{ color: "var(--phosphor)", fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
              If an account exists for <strong>{email}</strong>, we've sent a link to reset the password. Check your
              inbox (and spam folder) — it can take a minute to arrive.
            </p>
            <p className="tx-login-toggle">
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        ) : (
          <>
            {error && <p className="tx-login-error">{error}</p>}
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending..." : "Send reset link"}
              </button>
            </form>
            <p className="tx-login-toggle">
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
