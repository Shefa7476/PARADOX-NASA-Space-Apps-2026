import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowDown, ArrowLeft as Left, ArrowRight as Right, ArrowUp,
  BookOpen, Camera, ExternalLink, Gamepad2, Heart, Info, Mic, MicOff, Orbit,
  Play, RefreshCw, Rocket, Satellite, Sparkles, Trophy, Volume2, Weight, Zap,
} from "lucide-react";
import { API_BASE_URL } from "../context/AuthContext";
import "../styles/space-academy.css";

const TABS = [
  ["live", "NASA Space Desk", Satellite],
  ["games", "Mini-games", Gamepad2],
  ["pet", "Zippy's Space Pet", Heart],
  ["learn", "Crew & Learning", BookOpen],
  ["weight", "Planet Weight Lab", Weight],
];
const PLANET_GRAVITY = [
  ["Mercury", .38, "#b8a08e"], ["Venus", .91, "#d7a56d"], ["Earth", 1, "#38a9ed"],
  ["Moon", .165, "#c5cbd5"], ["Mars", .38, "#dc775a"], ["Jupiter", 2.34, "#d4a17a"],
  ["Saturn", 1.06, "#dfc18c"], ["Uranus", .92, "#8bd7dc"], ["Neptune", 1.19, "#6686ed"],
];
const WEEKLY_EVENTS = [
  { title: "Meteor Watch", text: "Track a meteor shower and learn why tiny space rocks glow in Earth's atmosphere.", icon: "☄️", skill: "Observation" },
  { title: "Moon Base Builder", text: "Choose a safe place, power source and shelter for a future Moon base.", icon: "🌙", skill: "Engineering" },
  { title: "Mars Weather Watch", text: "Read rover clues and prepare a robot for dusty Martian weather.", icon: "🔴", skill: "Planet science" },
  { title: "ISS Supply Run", text: "Plan a careful cargo rendezvous with the International Space Station.", icon: "🛰️", skill: "Orbital motion" },
];
const CREW = [
  { name: "Nova", role: "Mission Pilot", icon: "🧑‍🚀", colour: "#5bd7ff", tip: "Check your heading before every manoeuvre. Small corrections save fuel!" },
  { name: "Bolt", role: "Robotics Engineer", icon: "🤖", colour: "#f8bf68", tip: "A rover needs power, working wheels and a clear route to explore safely." },
  { name: "Luna", role: "Space Scientist", icon: "👩‍🔬", colour: "#c4a5ff", tip: "Good scientists use clues, test ideas and change their minds when evidence changes." },
];
const LEARN_TOPICS = [
  ["Solar System & Gravity", "Planet order, orbits, gravity and why your weight changes between worlds.", "Earth & Space Science · Grades 3–6"],
  ["Space Weather", "Solar flares, radiation, auroras and how spacecraft prepare for storms.", "Earth Science · Grades 4–7"],
  ["Engineering & Forces", "Thrust, fuel, momentum, landing speed and safe spacecraft design.", "Physical Science & Engineering · Grades 3–7"],
  ["Life Support & Habitats", "Oxygen, pressure, water recycling and the systems that keep crews safe.", "Life Science & Technology · Grades 4–7"],
];

function say(text) {
  try { const prefs = JSON.parse(localStorage.getItem("paradox_accessibility_preferences") || "{}"); if (prefs.voice === "off") return false; } catch { /* use browser default */ }
  if (!("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = Number(localStorage.getItem("paradox_age_mode") === "6-8" ? .82 : .96);
  utterance.pitch = 1.08;
  window.speechSynthesis.speak(utterance);
  return true;
}

function NasaDesk() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/nasa/space-dashboard`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Live space data is unavailable right now.");
      setData(body);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    load();
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/nasa/iss-location`);
        if (!response.ok) return;
        const iss = await response.json();
        setData((old) => old ? { ...old, iss } : old);
      } catch { /* keep the last known position when the tracker is offline */ }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load]);
  return <div className="academy-stack">
    <div className="academy-section-head"><div><span className="academy-eyebrow">REAL-WORLD SPACE DATA</span><h2>Mission Control Data Desk</h2><p>Explore public NASA data and the live position of the International Space Station.</p></div><button className="academy-action" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "academy-spin" : ""}/>{loading ? "Updating…" : "Refresh live data"}</button></div>
    {error && <div className="academy-notice"><Info size={17}/><span>{error} The rest of the Academy still works offline.</span></div>}
    {loading && !data && <div className="academy-loading"><Orbit className="academy-spin"/> Contacting space data services…</div>}
    {data && <>
      <div className="academy-live-grid">
        <article className="academy-data-card academy-apod">
          <div className="academy-card-kicker"><Camera size={15}/> NASA PICTURE OF THE DAY</div>
          {data.apod?.image_url ? <img src={data.apod.image_url} alt={data.apod.title} loading="lazy"/> : <div className="academy-image-placeholder">🌌</div>}
          <h3>{data.apod?.title || "NASA picture is taking a break"}</h3><p>{data.apod?.explanation || "Try refreshing later to see today's astronomy picture."}</p>
          <small>{data.apod?.date || "NASA APOD"} · NASA</small>
        </article>
        <article className="academy-data-card academy-iss-card">
          <div className="academy-card-kicker"><Satellite size={15}/> INTERNATIONAL SPACE STATION</div>
          {data.iss ? <>
            <div className="academy-iss-visual"><div className="academy-earth-globe">🌎</div><div className="academy-iss-orbit"><span>🛰️</span></div></div>
            <div className="academy-metric-grid"><div><strong>{data.iss.latitude}°</strong><small>Latitude</small></div><div><strong>{data.iss.longitude}°</strong><small>Longitude</small></div><div><strong>{data.iss.altitude_km.toLocaleString()} km</strong><small>Altitude</small></div><div><strong>{Math.round(data.iss.velocity_kmh).toLocaleString()} km/h</strong><small>Speed</small></div></div>
            <p className="academy-caption">The ISS circles Earth about every 90 minutes. Position is a live estimate from the public ISS tracker.</p>
          </> : <div className="academy-empty">ISS position is temporarily unavailable.</div>}
        </article>
        <article className="academy-data-card academy-neo-card">
          <div className="academy-card-kicker"><Orbit size={15}/> NEAR-EARTH ASTEROIDS</div>
          <div className="academy-neo-count">{data.near_earth_objects?.count ?? "—"}<small>objects tracked today</small></div>
          {(data.near_earth_objects?.items || []).slice(0, 4).map((item) => <div className="academy-neo-row" key={item.name}><span>☄️ {item.name}</span><strong>{item.kilometers ? `${item.kilometers.toLocaleString()} km` : "Distance n/a"}</strong>{item.hazardous && <em>Potentially hazardous</em>}</div>)}
          <p className="academy-caption">“Potentially hazardous” is an astronomy classification, not a prediction that an asteroid will hit Earth.</p>
        </article>
      </div>
      <article className="academy-data-card"><div className="academy-card-kicker"><Camera size={15}/> MARS ROVER PHOTO FEED</div><div className="academy-mars-grid">{(data.mars_photos || []).map((photo, index) => <figure key={`${photo.image_url}-${index}`}><img src={photo.image_url} alt={`Mars ${photo.camera}`} loading="lazy"/><figcaption>{photo.rover} · {photo.camera}<small>{photo.earth_date}</small></figcaption></figure>)}</div>{!data.mars_photos?.length && <p className="academy-caption">No recent rover image is available right now.</p>}</article>
      <p className="academy-footnote">{data.note} · NASA data may be delayed or rate-limited. NASA image and data credits remain with their original sources.</p>
    </>}
    <article className="academy-data-card academy-model-card"><div className="academy-card-kicker"><Orbit size={15}/> NASA 3D MODEL · INTERNATIONAL SPACE STATION</div><h3 className="mt-2 text-lg font-black">Rotate the real ISS model</h3><p className="mt-1 text-xs text-slate-400">Drag to rotate and use your fingers to zoom. The model is hosted by NASA's public 3D resources collection.</p><model-viewer class="academy-model-viewer" src="https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/international-space-station-%28iss%29-%28a%29/International%20Space%20Station%20%28ISS%29%20%28A%29.glb" alt="NASA International Space Station 3D model" camera-controls auto-rotate shadow-intensity="1" exposure="1" loading="lazy"></model-viewer><small className="academy-footnote">Model credit: NASA/Ames Research Center. If the model does not load, open the official NASA model page below.</small></article>
    <div className="academy-link-row"><a href="https://www.nasa.gov/3D-resources/" target="_blank" rel="noreferrer">Explore NASA's free 3D models <ExternalLink size={14}/></a><a href="https://science.nasa.gov/3d-resources/international-space-station-iss-a/" target="_blank" rel="noreferrer">View NASA ISS 3D model <ExternalLink size={14}/></a></div>
  </div>;
}

function MiniGames() {
  const [game, setGame] = useState("dock");
  const totalDodgeRounds = localStorage.getItem("paradox_age_mode") === "6-8" ? 6 : 8;
  const [dock, setDock] = useState({ x: 0, y: 2, moves: 0, done: false });
  const [round, setRound] = useState(0);
  const [lane, setLane] = useState(1);
  const [lives, setLives] = useState(3);
  const [dodgeActive, setDodgeActive] = useState(false);
  const [dodgeResult, setDodgeResult] = useState("");
  const sequence = useRef([]); const laneRef = useRef(1); const livesRef = useRef(3); const roundRef = useRef(0);
  const [altitude, setAltitude] = useState(100); const [speed, setSpeed] = useState(8); const [landingActive, setLandingActive] = useState(false); const [landingResult, setLandingResult] = useState("");
  const [parts, setParts] = useState({ nose: "point", body: "blue", fins: "wide", engine: "ion" });
  const [built, setBuilt] = useState(false);
  const dockingTarget = { x: 2, y: 0 };
  const moveDock = useCallback((dx, dy) => { setDock((old) => { const next = { ...old, x: Math.max(0, Math.min(2, old.x + dx)), y: Math.max(0, Math.min(2, old.y + dy)), moves: old.moves + 1 }; if (next.x === dockingTarget.x && next.y === dockingTarget.y) next.done = true; return next; }); }, []);
  useEffect(() => { const onKey = (event) => { if (game !== "dock") return; const moves = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0] }; if (moves[event.key]) { event.preventDefault(); moveDock(...moves[event.key]); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [game, moveDock]);
  function resetDock() { setDock({ x: 0, y: 2, moves: 0, done: false }); }
  function startDodge() { sequence.current = Array.from({ length: totalDodgeRounds }, () => Math.floor(Math.random() * 3)); roundRef.current = 0; livesRef.current = 3; laneRef.current = 1; setRound(0); setLives(3); setLane(1); setDodgeResult(""); setDodgeActive(true); }
  useEffect(() => { if (!dodgeActive) return undefined; const id = window.setInterval(() => { const hazard = sequence.current[roundRef.current]; if (hazard === laneRef.current) { livesRef.current -= 1; setLives(livesRef.current); } roundRef.current += 1; setRound(roundRef.current); if (livesRef.current <= 0) { setDodgeActive(false); setDodgeResult("The rover shield needs a recharge. Try another flight!"); } else if (roundRef.current >= totalDodgeRounds) { setDodgeActive(false); setDodgeResult("Amazing flying! You dodged the asteroid field and earned a star!"); localStorage.setItem("paradox_best_asteroid_dodge", String(Math.max(Number(localStorage.getItem("paradox_best_asteroid_dodge") || 0), totalDodgeRounds))); window.dispatchEvent(new Event("paradox:correct")); } }, 1150); return () => window.clearInterval(id); }, [dodgeActive, totalDodgeRounds]);
  function changeLane(value) { laneRef.current = value; setLane(value); }
  function startLanding() { setAltitude(100); setSpeed(8); setLandingResult(""); setLandingActive(true); }
  function landingStep(burn) { if (!landingActive) return; const nextSpeed = Math.max(0, speed + (burn ? -2.2 : 1.25)); const nextAltitude = Math.max(0, altitude - Math.max(2, nextSpeed * 2)); setSpeed(nextSpeed); setAltitude(nextAltitude); if (nextAltitude <= 0) { setLandingActive(false); setLandingResult(nextSpeed <= 3 ? "Perfect soft landing! Your crew is safe." : "Touchdown was too fast. Reset and try using the engine earlier."); } }
  const games = [["dock", "ISS Docking", "🛰️"], ["dodge", "Asteroid Dodge", "☄️"], ["land", "Soft Landing", "🚀"], ["build", "Rocket Builder", "🛠️"]];
  return <div className="academy-stack">
    <div className="academy-section-head"><div><span className="academy-eyebrow">PLAY · PRACTISE · LEARN</span><h2>Space Training Arcade</h2><p>Four short challenges designed for keyboard, mouse and touch.</p></div><span className="academy-pill"><Gamepad2 size={14}/> 4 mini-games</span></div>
    <div className="academy-game-tabs">{games.map(([id, title, icon]) => <button key={id} className={game === id ? "active" : ""} onClick={() => setGame(id)}><span>{icon}</span>{title}</button>)}</div>
    {game === "dock" && <section className="academy-game-panel"><div className="academy-game-copy"><span className="academy-eyebrow">TRAINING 01 · ORBITAL CONTROL</span><h3>Dock with the space station</h3><p>Guide your capsule from the lower-left launch point to the glowing docking port in the upper-right. Use the arrow buttons or keyboard arrow keys.</p><div className="academy-game-status">{dock.done ? "Docking successful! 🎉" : `Position: ${dock.x + 1}, ${dock.y + 1} · Moves: ${dock.moves}`}</div><button className="academy-action" onClick={resetDock}><RefreshCw size={15}/> Reset docking</button></div><div className="academy-docking-board">{Array.from({ length: 9 }, (_, index) => { const x = index % 3; const y = Math.floor(index / 3); const isShip = dock.x === x && dock.y === y; const isTarget = dockingTarget.x === x && dockingTarget.y === y; return <div key={index} className={`academy-dock-cell ${isTarget ? "target" : ""} ${isShip ? "ship" : ""}`}>{isShip ? "🚀" : isTarget ? "🛰️" : "·"}</div>; })}<div className="academy-dock-controls"><button onClick={() => moveDock(0,-1)} aria-label="Move up"><ArrowUp/></button><button onClick={() => moveDock(-1,0)} aria-label="Move left"><Left/></button><button onClick={() => moveDock(0,1)} aria-label="Move down"><ArrowDown/></button><button onClick={() => moveDock(1,0)} aria-label="Move right"><Right/></button></div></div></section>}
    {game === "dodge" && <section className="academy-game-panel"><div className="academy-game-copy"><span className="academy-eyebrow">TRAINING 02 · PILOT REFLEXES</span><h3>Asteroid Dodge</h3><p>Move your ship to a safe lane. Each wave brings an asteroid through one of the three lanes. You have three shield points.</p><div className="academy-game-status">Wave {round}/{totalDodgeRounds} · Shields {"❤️".repeat(lives)}{"🖤".repeat(3-lives)}</div><button className="academy-action" onClick={startDodge}><Play size={15}/> {dodgeActive ? "Restart challenge" : "Start asteroid run"}</button>{dodgeResult && <p className="academy-result">{dodgeResult}</p>}</div><div className="academy-lane-arena"><div className="academy-asteroid-wave" key={`${round}-${dodgeActive}`}>☄️</div><div className="academy-lanes">{[0,1,2].map((n) => <button key={n} className={lane === n ? "selected" : ""} onClick={() => changeLane(n)} aria-label={`Choose lane ${n+1}`}>{lane === n ? "🚀" : "·"}</button>)}</div><small>Choose a lane before the next wave</small></div></section>}
    {game === "land" && <section className="academy-game-panel"><div className="academy-game-copy"><span className="academy-eyebrow">TRAINING 03 · THRUST CONTROL</span><h3>Land softly on the Moon</h3><p>Tap “Burn engine” to slow down. A safe touchdown happens when the speed is 3 or lower at altitude zero.</p><div className="academy-metric-grid"><div><strong>{altitude} km</strong><small>Altitude</small></div><div><strong>{speed.toFixed(1)} m/s</strong><small>Downward speed</small></div></div><div className="academy-control-row"><button className="academy-action" onClick={() => landingActive ? landingStep(true) : startLanding()}>{landingActive ? "🔥 Burn engine" : "▶ Start landing"}</button><button className="academy-quiet-button" onClick={() => landingStep(false)} disabled={!landingActive}>Coast 5 sec</button><button className="academy-quiet-button" onClick={startLanding}>Reset</button></div>{landingResult && <p className="academy-result">{landingResult}</p>}</div><div className="academy-landing-scene"><div className="academy-moon">🌕</div><div className="academy-lander" style={{ bottom: `${Math.max(8, 18 + (100-altitude)*.55)}%` }}>🚀</div><div className="academy-altitude-line" style={{ height: `${altitude}%` }}/><span>{altitude}% TO SURFACE</span></div></section>}
    {game === "build" && <section className="academy-game-panel"><div className="academy-game-copy"><span className="academy-eyebrow">TRAINING 04 · ENGINEERING BAY</span><h3>Build a rocket</h3><p>Choose a nose, body, fins and engine. Every part has a job: cut through air, hold fuel, keep balance and make thrust.</p><div className="academy-build-controls">{Object.entries({ nose: ["point","round"], body: ["blue","orange","mint"], fins: ["wide","compact"], engine: ["ion","chemical"] }).map(([key, options]) => <label key={key}>{key}<select value={parts[key]} onChange={(e) => { setParts((old) => ({...old,[key]:e.target.value})); setBuilt(false); }}>{options.map((item) => <option key={item}>{item}</option>)}</select></label>)}</div><button className="academy-action" onClick={() => setBuilt(true)}><Rocket size={15}/> Test my rocket</button>{built && <p className="academy-result">Rocket assembled! Engineers check every part before launch. ⭐</p>}</div><div className={`academy-rocket-preview body-${parts.body} nose-${parts.nose} fins-${parts.fins} engine-${parts.engine}`}><div className="academy-rocket-nose"/><div className="academy-rocket-body"><span>PARADOX</span></div><div className="academy-rocket-fin left"/><div className="academy-rocket-fin right"/><div className="academy-rocket-flame"/></div></section>}
  </div>;
}

function SpacePet() {
  const today = new Date().toLocaleDateString("en-CA");
  const [pet, setPet] = useState(() => { try { const saved = JSON.parse(localStorage.getItem("paradox_space_pet") || "null"); const base = saved || { name: "Zippy Jr.", happiness: 70, snacks: 3, level: 1, lastFed: "" }; return base.lastFed !== today ? { ...base, snacks: 3, lastFed: today } : base; } catch { return { name: "Zippy Jr.", happiness: 70, snacks: 3, level: 1, lastFed: today }; } });
  const [message, setMessage] = useState("Hi, friend! Want to explore the stars together?");
  useEffect(() => { localStorage.setItem("paradox_space_pet", JSON.stringify(pet)); }, [pet]);
  function feed() { if (!pet.snacks) { setMessage("Your snack box is empty. Come back tomorrow for more treats!"); return; } setPet((old) => { const happiness = Math.min(100, old.happiness + 15); const level = old.happiness < 100 && happiness === 100 ? old.level + 1 : old.level; return { ...old, happiness, snacks: old.snacks - 1, level, lastFed: today }; }); setMessage("Yum! Cosmic star snacks are Zippy Jr.'s favourite! ✨"); }
  return <div className="academy-stack"><div className="academy-section-head"><div><span className="academy-eyebrow">A LITTLE FRIEND ON EVERY JOURNEY</span><h2>Look after your space pet</h2><p>Give Zippy Jr. a snack and check its happiness before your next mission.</p></div><span className="academy-pill">🐣 Level {pet.level}</span></div><section className="academy-pet-panel"><div className="academy-pet-art"><div className="academy-pet-orbit"/><div className="academy-pet-emoji">🤖</div><span className="academy-pet-star star-a">⭐</span><span className="academy-pet-star star-b">✨</span></div><div className="academy-pet-info"><span className="academy-eyebrow">YOUR SPACE COMPANION</span><h3>{pet.name}</h3><p className="academy-pet-message">{message}</p><div className="academy-meter"><span>Happiness</span><strong>{pet.happiness}%</strong><i><b style={{width:`${pet.happiness}%`}}/></i></div><div className="academy-meter"><span>Cosmic snacks</span><strong>{pet.snacks} left</strong></div><button className="academy-action" onClick={feed}><Heart size={16}/> Give a star snack</button><p className="academy-footnote">Pet care is saved on this device. It does not collect photos, voice recordings or personal details.</p></div></section></div>;
}

function CrewLearning() {
  const [crew, setCrew] = useState(0);
  const bestDodge = Number(localStorage.getItem("paradox_best_asteroid_dodge") || 0);
  const [event] = useState(() => WEEKLY_EVENTS[Math.floor(Date.now() / (7 * 86400000)) % WEEKLY_EVENTS.length]);
  const season = useMemo(() => { const month = new Date().getMonth(); if (month === 11) return "Winter Aurora"; if (month >= 2 && month <= 3) return "Spring Cosmic Bloom"; if (month >= 5 && month <= 7) return "Meteor Summer"; return "Star Explorer Season"; }, []);
  return <div className="academy-stack"><div className="academy-section-head"><div><span className="academy-eyebrow">CHAPTER STORY · THE LOST STAR MAP</span><h2>Help Zippy find the way home</h2><p>Each planet holds one clue. Your crew must investigate, learn and put the star map back together.</p></div><span className="academy-pill">🪐 {season}</span></div>
    <article className="academy-story-card"><span>🤖</span><div><strong>Chapter 1: A mysterious signal</strong><p>Zippy's tiny navigation robot has lost its map in a cosmic storm. Nova can fly, Bolt can repair, and Luna can read the science clues. You are the mission commander!</p></div><button className="academy-voice-button" onClick={()=>say("Chapter one. A mysterious signal. Zippy's tiny navigation robot has lost its map in a cosmic storm. Nova can fly, Bolt can repair, and Luna can read the science clues. You are the mission commander!")}><Volume2 size={15}/> Listen to story</button></article><div className="academy-crew-grid">{CREW.map((member,index)=><button key={member.name} className={`academy-crew-card ${crew===index?"selected":""}`} onClick={()=>setCrew(index)}><span className="academy-crew-avatar" style={{"--crew-colour":member.colour}}>{member.icon}</span><strong>{member.name}</strong><small>{member.role}</small>{crew===index&&<p>{member.tip}</p>}</button>)}</div><article className="academy-event-card"><div className="academy-event-icon">{event.icon}</div><div><span className="academy-eyebrow">THIS WEEK'S SPACE EVENT</span><h3>{event.title}</h3><p>{event.text}</p><small>Learning focus: {event.skill}</small></div><button className="academy-voice-button" onClick={()=>say(`${event.title}. ${event.text}`)}><Volume2 size={15}/> Listen</button><Link className="academy-action" to="/solar-storm"><Zap size={15}/> Start a boss mission</Link></article><div className="academy-section-head"><div><span className="academy-eyebrow">WHAT YOU'RE LEARNING</span><h2>Space science topics</h2></div></div><div className="academy-learning-grid">{LEARN_TOPICS.map(([title,desc,grade],index)=><article key={title}><span>{["🪐","☀️","🚀","🧬"][index]}</span><h3>{title}</h3><p>{desc}</p><small>{grade}</small></article>)}</div><article className="academy-data-card"><div className="academy-card-kicker"><Trophy size={15}/> PERSONAL BEST BOARD</div><h3 className="mt-2 text-xl font-black">Your asteroid-dodge record</h3><p className="mt-1 text-sm text-slate-300">{bestDodge ? `${bestDodge} safe waves in one run` : "No score yet — try the Asteroid Dodge mini-game!"}</p><small className="academy-footnote">Scores stay on this device. PARADOX does not publish children's names or scores to a public leaderboard.</small></article><div className="academy-link-row"><Link to="/missions">Explore planet missions <ExternalLink size={14}/></Link><Link to="/solar-storm">Try the Solar Storm boss mission <Zap size={14}/></Link></div></div>;
}

function PlanetWeightLab() {
  const [earthWeight, setEarthWeight] = useState("30");
  const [planet, setPlanet] = useState("Moon");
  const selected = PLANET_GRAVITY.find((item) => item[0] === planet) || PLANET_GRAVITY[3];
  const weight = Math.max(0, Number(earthWeight) || 0) * selected[1];
  return <div className="academy-stack"><div className="academy-section-head"><div><span className="academy-eyebrow">GRAVITY EXPERIMENT</span><h2>How much would you weigh?</h2><p>Your mass stays the same, but your weight changes because gravity is different on each world.</p></div><span className="academy-pill"><Weight size={14}/> Science Lab</span></div><section className="academy-weight-panel"><div className="academy-weight-input"><label htmlFor="earth-weight">Your Earth weight (kg)</label><input id="earth-weight" type="number" min="1" max="300" value={earthWeight} onChange={(e)=>setEarthWeight(e.target.value)}/><label htmlFor="weight-planet">Choose a world</label><select id="weight-planet" value={planet} onChange={(e)=>setPlanet(e.target.value)}>{PLANET_GRAVITY.map(([name])=><option key={name}>{name}</option>)}</select><p className="academy-footnote">For this learning activity, kilograms are used as a familiar comparison. The result is an approximate Earth-scale weight comparison.</p></div><div className="academy-weight-result"><div className="academy-weight-planet" style={{"--planet-colour":selected[2]}}>🪐</div><span>YOUR COMPARISON ON {planet.toUpperCase()}</span><strong>{weight.toFixed(1)} <small>kg-equivalent</small></strong><p>{selected[1] < .5 ? "You would feel much lighter here!" : selected[1] > 1.5 ? "Gravity pulls much more strongly here." : "Gravity is fairly close to Earth's pull."}</p><button className="academy-voice-button" onClick={()=>say(`If your Earth weight is ${earthWeight} kilograms, your approximate weight comparison on ${planet} is ${weight.toFixed(1)} kilograms. This is because gravity is different on each world.`)}><Volume2 size={15}/> Read this result aloud</button></div></section><div className="academy-fact-strip"><Info size={17}/> Weight depends on gravity. Your mass—the amount of matter in your body—does not change when you travel to another planet.</div></div>;
}

export default function SpaceAcademy() {
  const [tab, setTab] = useState("live");
  const [ageMode, setAgeMode] = useState(() => localStorage.getItem("paradox_age_mode") || "9-12");
  const [listening, setListening] = useState(false);
  const recognition = useRef(null);
  function changeAge(value) { setAgeMode(value); localStorage.setItem("paradox_age_mode", value); window.dispatchEvent(new Event("paradox:preferences-updated")); }
  function startVoiceCommand() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Voice commands are not supported in this browser. Try Chrome or Edge."); return; }
    const rec = new SpeechRecognition(); recognition.current = rec; rec.lang = "en-US"; rec.interimResults = false;
    rec.onstart = () => setListening(true); rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (event) => { const phrase = event.results?.[0]?.[0]?.transcript?.toLowerCase() || ""; if (phrase.includes("launch") || phrase.includes("planet")) window.location.href = "/missions"; else if (phrase.includes("quiz")) window.location.href = "/time-attack"; else if (phrase.includes("space academy")) say("Welcome to the Space Academy!"); else say("I heard you. Try saying launch mission or open quiz."); };
    rec.start();
  }
  useEffect(() => () => recognition.current?.stop(), []);
  return <main className="academy-page"><header className="academy-hero"><div className="academy-hero-art"><span className="academy-hero-planet planet-one"/><span className="academy-hero-planet planet-two"/><span className="academy-hero-rocket">🚀</span></div><div className="academy-hero-copy"><span className="academy-eyebrow"><Sparkles size={14}/> PARADOX SPACE ACADEMY</span><h1>Train like a real <em>space explorer.</em></h1><p>Explore NASA discoveries, practise astronaut skills, care for your space pet and learn the science behind every adventure.</p><div className="academy-hero-actions"><Link to="/missions" className="academy-action"><Rocket size={16}/> Launch a planet mission</Link><button className="academy-voice-button" onClick={startVoiceCommand}>{listening?<MicOff size={16}/>:<Mic size={16}/>} {listening?"Listening…":"Try voice command"}</button></div></div></header><div className="academy-toolbar"><label>Learning age mode <select value={ageMode} onChange={(e)=>changeAge(e.target.value)}><option value="6-8">Young Explorer · 6–8</option><option value="9-12">Junior Scientist · 9–12</option></select></label><span>Voice command examples: “Launch mission” · “Open quiz”</span></div><nav className="academy-tabs" aria-label="Space Academy tools">{TABS.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={17}/>{label}</button>)}</nav>{tab==="live"&&<NasaDesk/>}{tab==="games"&&<MiniGames/>}{tab==="pet"&&<SpacePet/>}{tab==="learn"&&<CrewLearning/>}{tab==="weight"&&<PlanetWeightLab/>}<footer className="academy-footer"><Link to="/missions"><ArrowLeft size={15}/> Back to Solar System</Link><span>Learn something new. Try something brave. Keep exploring. ⭐</span></footer></main>;
}
