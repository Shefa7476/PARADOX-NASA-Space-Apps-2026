import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, BookOpen, CircleCheckBig, Clock3, LockKeyhole, ShieldCheck, Star, Trophy } from "lucide-react";
import { API_BASE_URL } from "../context/AuthContext";
import { authFetch } from "../services/api";
import "../styles/parent-zone.css";

function readUsage() {
  try { const raw = JSON.parse(localStorage.getItem("paradox_daily_usage") || "{}"); return raw.date === new Date().toLocaleDateString("en-CA") ? raw.seconds || 0 : 0; }
  catch { return 0; }
}

export default function ParentZone() {
  const [password, setPassword] = useState("");
  const [verified, setVerified] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(() => localStorage.getItem("paradox_daily_limit") || "45");
  const [usage, setUsage] = useState(readUsage());
  const [busy, setBusy] = useState(false);
  useEffect(() => { const update = () => setUsage(readUsage()); window.addEventListener("paradox:usage-updated", update); return () => window.removeEventListener("paradox:usage-updated", update); }, []);
  async function verify(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await authFetch(`${API_BASE_URL}/api/auth/verify-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Parent verification failed.");
      const dataResponse = await authFetch(`${API_BASE_URL}/api/account/summary`);
      const data = await dataResponse.json();
      if (!dataResponse.ok) throw new Error(data.detail || "Could not load progress summary.");
      setSummary(data); setVerified(true); setPassword("");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function saveLimit(value) { setLimit(value); localStorage.setItem("paradox_daily_limit", value); window.dispatchEvent(new Event("paradox:preferences-updated")); }
  const minutes = Math.floor(usage / 60);
  if (!verified) return <main className="parent-zone-page"><section className="parent-gate"><div className="parent-gate-icon"><LockKeyhole size={32}/></div><span className="academy-eyebrow">PARENT / GUARDIAN AREA</span><h1>Adult check</h1><p>This area contains the explorer's learning progress and play-time settings. Ask the parent or guardian who created the account to enter the account password.</p><form onSubmit={verify}><label htmlFor="parent-password">Parent account password</label><input id="parent-password" type="password" autoComplete="current-password" minLength={8} value={password} onChange={(e)=>setPassword(e.target.value)} required/><button disabled={busy}>{busy?"Checking…":"Verify and continue"}</button></form>{error&&<p role="alert" className="parent-error">{error}</p>}<small>Verification is performed by the PARADOX backend. Do not share the password with the child.</small></section></main>;
  return <main className="parent-zone-page"><header className="parent-heading"><span className="academy-eyebrow"><ShieldCheck size={14}/> PARENT / GUARDIAN DASHBOARD</span><h1>Learning & play report</h1><p>Progress from this account, plus device-local play-time information.</p></header><div className="parent-stat-grid"><article><Trophy/><strong>{summary?.stats?.missions_successful || 0}</strong><span>Successful missions</span></article><article><Star/><strong>{summary?.stats?.xp || 0}</strong><span>Total XP</span></article><article><BookOpen/><strong>{summary?.stats?.quiz_best_score || 0}/10</strong><span>Best quiz score</span></article><article><Clock3/><strong>{minutes} min</strong><span>Today's play time on this device</span></article></div><section className="parent-panel"><div><h2>Daily play-time reminder</h2><p>Choose a gentle daily play-time target. PARADOX will show a break reminder when the target is reached.</p></div><label>Daily target<select value={limit} onChange={(e)=>saveLimit(e.target.value)}><option value="20">20 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="0">No reminder</option></select></label></section><section className="parent-panel"><h2>Planet learning progress</h2><div className="parent-progress-list">{(summary?.progression?.planets || []).map((planet)=> <div key={planet.mission_id} className="parent-progress-row"><div><strong>{planet.planet_name}</strong><small>{planet.completed_scenarios}/{planet.total_scenarios} adventures complete</small></div><div className="parent-progress-track"><i style={{width:`${planet.total_scenarios?planet.completed_scenarios/planet.total_scenarios*100:0}%`}}/></div><span>{planet.completed?"Complete":planet.unlocked?"In progress":"Locked"}</span></div>)}</div></section><section className="parent-panel"><h2>Recent learning activity</h2>{(summary?.history || []).slice(0,8).map((item)=> <div className="parent-history-row" key={item.id}><span>{item.status==="SUCCESS"?<CircleCheckBig/>:<Activity/>}</span><div><strong>{item.mission_title}</strong><small>{item.scenario_name} · {item.difficulty}</small></div><b>{item.status}</b></div>)}{!summary?.history?.length&&<p>No completed missions yet. The first adventure is waiting!</p>}</section><section className="parent-note"><ShieldCheck/><p><strong>Privacy note:</strong> Play time and daily limits are stored on this device. Mission progress is stored in the local PARADOX account database. This is a local parent dashboard, not a school monitoring or remote-control service.</p></section><div className="parent-actions"><Link to="/settings">Accessibility & learning settings</Link><Link to="/privacy">Privacy information</Link><button onClick={()=>setVerified(false)}>Lock parent area</button><Link to="/account"><ArrowLeft size={15}/> Back to player dashboard</Link></div></main>;
}
