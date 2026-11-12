import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Rocket, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", display_name: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (field, value) => setForm((old) => ({ ...old, [field]: value }));

  async function submit(event) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      await register(form);
      localStorage.setItem("paradox_tutorial_pending", "1");
      window.dispatchEvent(new Event("paradox:show-tutorial"));
      navigate("/", { replace: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-panel auth-panel-wide">
    <div className="auth-icon"><Sparkles size={27} /></div>
    <p className="auth-eyebrow">JOIN THE SPACE CREW</p>
    <h1>Your adventure starts here.</h1>
    <p className="auth-copy">A parent or guardian creates the account. The explorer uses a nickname and never needs to enter a personal email address.</p>
    <form onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2">
      <label className="auth-label">Explorer nickname<input className="auth-input" value={form.display_name} onChange={(e) => update("display_name", e.target.value)} minLength={2} maxLength={30} autoComplete="nickname" required /></label>
      <label className="auth-label">Explorer username<input className="auth-input" value={form.username} onChange={(e) => update("username", e.target.value)} minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" autoComplete="username" required /></label>
      <label className="auth-label sm:col-span-2">Parent / guardian email<input className="auth-input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" required /><small className="block pt-1 text-xs text-slate-400">Use a grown-up's email address. Do not enter a child's personal email.</small></label>
      <label className="auth-label sm:col-span-2">Parent / guardian password<input className="auth-input" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} minLength={8} maxLength={128} autoComplete="new-password" required /><small className="block pt-1 text-xs text-slate-400">A grown-up should keep this password private.</small></label>
      <p className="sm:col-span-2 rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-3 text-xs leading-6 text-slate-300">By creating an account, the parent or guardian confirms they have read the <a className="text-cyan-300 underline" href="/privacy">Privacy Guide</a>. PARADOX uses an explorer nickname and does not offer public child chat or profile-photo uploads.</p>
      {error && <p role="alert" className="auth-error sm:col-span-2">{error}</p>}
      <button className="auth-submit sm:col-span-2" disabled={busy}>{busy ? "Creating explorer profile…" : <><Rocket size={17} /> Create account</>}</button>
    </form>
    <p className="auth-footer">Already in the crew? <Link to="/login">Log in</Link></p>
  </section></main>;
}
