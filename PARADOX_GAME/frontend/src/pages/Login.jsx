import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, Rocket } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email_or_username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      await login(form);
      navigate(location.state?.from?.pathname || "/missions", { replace: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-panel">
    <div className="auth-icon"><Rocket size={27} /></div>
    <p className="auth-eyebrow">WELCOME BACK, EXPLORER</p>
    <h1>Ready for takeoff?</h1>
    <p className="auth-copy">Sign in to continue your space adventures and mission progress.</p>
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="auth-label">Email or username<input className="auth-input" autoComplete="username" value={form.email_or_username} onChange={(e) => setForm({ ...form, email_or_username: e.target.value })} required /></label>
      <label className="auth-label">Password<input className="auth-input" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button className="auth-submit" disabled={busy}>{busy ? "Opening airlock…" : <><LockKeyhole size={17} /> Log in</>}</button>
    </form>
    <p className="auth-footer">New explorer? <Link to="/signup">Create your account</Link></p>
  </section></main>;
}
