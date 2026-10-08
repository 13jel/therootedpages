import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";

export default function Login() {
  usePageTitle("Logga in");

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);

    setLoading(false);

    if (signInError) {
      setError("Fel e-post eller lösenord.");
      return;
    }

    navigate(from, { replace: true });
  }

  const errorProps = error
    ? { "aria-invalid": "true", "aria-describedby": "login-error" }
    : {};

  return (
    <div className="login-page">
      <h1>Logga in</h1>
      <form onSubmit={handleSubmit}>
        <label>
          E-post
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            {...errorProps}
          />
        </label>

        <label>
          Lösenord
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            {...errorProps}
          />
        </label>

        {error && (
          <p id="login-error" className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Loggar in..." : "Logga in"}
        </button>
      </form>

      <p>
        Inget konto? <Link to="/register">Registrera dig</Link>
      </p>
    </div>
  );
}
