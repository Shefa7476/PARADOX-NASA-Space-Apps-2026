import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Printer, Rocket, Star } from "lucide-react";
import { API_BASE_URL, useAuth } from "../context/AuthContext";
import { authFetch } from "../services/api";
import "../styles/certificate.css";

export default function Certificate() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { let live=true; authFetch(`${API_BASE_URL}/api/account/summary`).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.detail||"Could not load certificate progress.");if(live)setSummary(d);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;}; }, []);
  const successes=summary?.stats?.missions_successful||0;
  const worlds=summary?.progression?.planets?.filter(p=>p.completed).length||0;
  return <main className="certificate-page"><div className="certificate-toolbar"><Link to="/account">← Back to dashboard</Link><button onClick={()=>window.print()} disabled={!summary}><Printer size={17}/> Print / Save as PDF</button></div>{error&&<p role="alert">{error}</p>}<section className="certificate-sheet"><div className="certificate-stars">✦ ✧ ✦ ✧ ✦</div><div className="certificate-brand"><Rocket size={28}/> PARADOX SPACE ACADEMY</div><span className="certificate-eyebrow">CERTIFICATE OF EXPLORATION</span><h1>Junior Space Explorer</h1><p className="certificate-intro">This certificate is proudly presented to</p><div className="certificate-name">{user?.display_name||"Space Explorer"}</div><p className="certificate-copy">for curiosity, courage and scientific thinking while exploring the Solar System, solving mission challenges and learning about space.</p><div className="certificate-awards"><div><Star/><strong>{successes}</strong><small>Successful missions</small></div><div><Award/><strong>{worlds}/8</strong><small>Planets completed</small></div><div><Rocket/><strong>{summary?.stats?.xp||0}</strong><small>Explorer XP</small></div></div><div className="certificate-footer"><span>PARADOX MISSION CONTROL</span><span>{new Date().toLocaleDateString()}</span></div><div className="certificate-seal">✦<small>SPACE<br/>CREW</small></div></section><p className="certificate-note">This is a printable learning award generated from the local PARADOX account record. It is not an official NASA certificate.</p></main>;
}
