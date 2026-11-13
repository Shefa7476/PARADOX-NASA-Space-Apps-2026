import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Atom, Bot, Music, Orbit, Rocket, Sparkles, Telescope } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authFetch } from "../services/api";

const API = (import.meta.env.VITE_API_BASE_URL === "same-origin" ? "" : (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"));
const planets = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"];

export default function Home() {
  const { user } = useAuth();
  const [apiStatus, setApiStatus] = useState("Checking mission control…");

  useEffect(() => {
    let active = true;
    let timer;
    const checkBackend = () => authFetch(`${API}/api/game`)
      .then((response) => { if (!response.ok) throw new Error("offline"); return response.json(); })
      .then((data) => { if (active) setApiStatus(`${data.name} ONLINE`); })
      .catch(() => { if (active) setApiStatus("CONNECTING TO MISSION CONTROL…"); });
    checkBackend();
    timer = window.setInterval(checkBackend, 4000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return (
    <main className="home-world">
      <div className="home-nebula home-nebula-a" />
      <div className="home-nebula home-nebula-b" />
      <div className="home-hero mx-auto max-w-7xl px-5 pb-20 pt-16 text-center md:px-8 md:pt-20">
        <div className="home-orbit-art" aria-hidden="true">
          <div className="home-sun" />
          {planets.map((planet, index) => <span key={planet} className={`home-mini-planet home-mini-${planet}`} style={{ "--i": index }} />)}
          <div className="home-rocket-float"><Rocket size={42} /></div>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl">
          <span className="home-kicker"><Sparkles size={14} /> A SPACE ADVENTURE FOR CURIOUS MINDS</span>
          <h1 className="home-title mt-6">THE UNIVERSE IS<br /><span>YOUR PLAYGROUND.</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
            Become a young space explorer. Discover planets, solve cosmic mysteries,
            rescue missions and learn real space science through animated adventures.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            {user ? (
              <>
                <Link to="/missions" className="home-primary-cta">Start Adventure <Rocket size={19} /></Link>
                <Link to="/account" className="home-secondary-cta">My dashboard <ArrowRight size={17} /></Link>
              </>
            ) : (
              <>
                <Link to="/signup" className="home-primary-cta">Start Adventure <Rocket size={19} /></Link>
                <Link to="/login" className="home-secondary-cta">I already have an account</Link>
              </>
            )}
          </div>
          <p className="mt-5 text-xs font-bold tracking-[.18em] text-cyan-200/60">{apiStatus}</p>
        </div>

        <div className="home-stat-strip" aria-label="What's inside">
          <span><b>8</b> planets</span><span><b>24</b> adventures</span><span><b>216</b> science questions</span><span><b>3</b> difficulty levels</span>
        </div>

        <div className="home-feature-row mx-auto mt-14 grid max-w-6xl gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          <div className="home-feature"><span><Orbit /></span><h3>Explore 8 Worlds</h3><p>Fly a rocket to every planet. Each world has its own adventures and science.</p></div>
          <div className="home-feature"><span><Atom /></span><h3>Pick Your Level</h3><p>Easy, Medium or Hard. Every level brings different questions and explanations.</p></div>
          <div className="home-feature"><span><Bot /></span><h3>Ask the AI Co-Pilot</h3><p>Curious about an answer? Zippy explains it simply, with examples and read-aloud.</p></div>
          <div className="home-feature"><span><Music /></span><h3>Sing Along</h3><p>Space soundtracks plus Twinkle Twinkle Little Star and other favourite nursery songs.</p></div>
        </div>

        {user && <Link to="/planet-smash" className="home-smash-card"><span aria-hidden="true">🚀💥🪐</span><b>Planet Smash</b><small>Launch rockets at silly cartoon planets. They always bounce back!</small></Link>}

        <div className="home-bottom-note mt-14"><Telescope size={17} /> Made for curious young explorers and future scientists. <Link to="/privacy" className="ml-3 text-cyan-300 underline">Family privacy guide</Link></div>
      </div>
    </main>
  );
}
