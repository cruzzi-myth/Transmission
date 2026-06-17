import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser, signupUser } from "../utils/firebase";
import "./Login.css";

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignup) await signupUser(name, email, password);
      else await loginUser(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
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
        <h1>{isSignup ? "Create an account" : "Sign in"}</h1>
        {error && <p className="tx-login-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          {isSignup && (
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Loading..." : isSignup ? "Sign up" : "Sign in"}
          </button>
        </form>
        {!isSignup && (
          <p className="tx-login-toggle">
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>
        )}
        <p className="tx-login-toggle">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <span onClick={() => setIsSignup(!isSignup)}>{isSignup ? "Sign in" : "Create one"}</span>
        </p>
      </div>
    </div>
  );
}
