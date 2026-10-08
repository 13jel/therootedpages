import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePageTitle } from "../hooks/usePageTitle";

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [errorField, setErrorField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const headingRef = useRef(null);

  usePageTitle(awaitingConfirmation ? "Kolla din inkorg" : "Skapa konto");

  useEffect(() => {
    if (awaitingConfirmation) headingRef.current?.focus();
  }, [awaitingConfirmation]);

  function fail(message, field, ref) {
    setError(message);
    setErrorField(field);
    ref?.current?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setErrorField(null);

    if (password !== confirmPassword) {
      fail("Lösenorden matchar inte.", "confirm", confirmRef);
      return;
    }
    if (password.length < 6) {
      fail("Lösenordet måste vara minst 6 tecken.", "password", passwordRef);
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await signUp(email, password);
    setLoading(false);

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        fail(
          "Det finns redan ett konto med den e-postadressen.",
          "email",
          emailRef,
        );
      } else {
        fail("Något gick fel: " + signUpError.message, null, null);
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

  function fieldProps(field, extraDescribedBy) {
    const describedBy = [
      extraDescribedBy,
      errorField === field && "register-error",
    ]
      .filter(Boolean)
      .join(" ");
    return {
      "aria-invalid": errorField === field ? "true" : undefined,
      "aria-describedby": describedBy || undefined,
    };
  }

  if (awaitingConfirmation) {
    return (
      <div className="login-page">
        <h1 ref={headingRef} tabIndex={-1}>
          Kolla din inkorg
        </h1>
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
            ref={emailRef}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            {...fieldProps("email")}
          />
        </label>

        <label>
          Lösenord
          <input
            ref={passwordRef}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            {...fieldProps("password", "password-hint")}
          />
        </label>
        <p id="password-hint" className="form-hint">
          Minst 6 tecken.
        </p>

        <label>
          Bekräfta lösenord
          <input
            ref={confirmRef}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            {...fieldProps("confirm")}
          />
        </label>

        {error && (
          <p id="register-error" className="form-error" role="alert">
            {error}
          </p>
        )}

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
