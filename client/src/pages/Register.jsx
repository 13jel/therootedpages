import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte.");
      return;
    }
    if (password.length < 6) {
      setError("Lösenordet måste vara minst 6 tecken.");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await signUp(email, password);
    setLoading(false);

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        setError("Det finns redan ett konto med den e-postadressen.");
      } else {
        setError("Något gick fel: " + signUpError.message);
      }
      return;
    }

    if (data.session) {
      // E-postbekräftelse avstängd i Supabase-projektet -> redan inloggad
      navigate("/products");
    } else {
      // Standardläget: Supabase kräver att länken i mejlet klickas innan inloggning
      setAwaitingConfirmation(true);
    }
  }

  if (awaitingConfirmation) {
    return (
      <div className="login-page">
        <h1>Kolla din inkorg</h1>
        <p>
          Vi har skickat ett bekräftelsemejl till <strong>{email}</strong>.
          Klicka på länken där för att aktivera kontot, logga sedan in som
          vanligt.
        </p>
      </div>
    );
  }

  return (
    <div className="login-page">
      <h1>Skapa konto</h1>
      <form onSubmit={handleSubmit}>
        <label>
          E-post
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Lösenord
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        <label>
          Bekräfta lösenord
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Skapar konto..." : "Skapa konto"}
        </button>
      </form>

      <p>
        Har du redan ett konto? <Link to="/login">Logga in</Link>
      </p>
    </div>
  );
}
