// PARADOX cartoon cast, drawn as lightweight inline SVG (no image files or
// animation libraries). Same soft, rounded style as Zippy the robot.

const PLANET_COLORS = {
  Mercury: ["#d9c2ae", "#8d7360"], Venus: ["#f4d394", "#c98b3c"], Earth: ["#6cc7ff", "#1f6fb8"], Mars: ["#f39a7a", "#b44a2c"],
  Jupiter: ["#f0c9a0", "#b47b4f"], Saturn: ["#f3dfae", "#c49a52"], Uranus: ["#a9ecec", "#4aa7b0"], Neptune: ["#8fa8ff", "#3654c9"],
  Moon: ["#eef0f3", "#8f97a6"], Pluto: ["#f1e4da", "#9b8577"], Sun: ["#fff1a8", "#f59e0b"],
};

/** Nova, the floating astronaut. mood: idle | wave | cheer | think */
export function NovaAstronaut({ size = 120, mood = "idle", className = "" }) {
  return (
    <svg className={`nova nova-${mood} ${className}`} width={size} height={size * 1.15} viewBox="0 0 120 138" role="img" aria-label="Nova the astronaut">
      <defs>
        <radialGradient id="nv-suit" cx="35%" cy="25%" r="85%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#c9d8f2" /></radialGradient>
        <linearGradient id="nv-visor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3b2a8f" /><stop offset=".6" stopColor="#1b2f6e" /><stop offset="1" stopColor="#0f8fb3" /></linearGradient>
      </defs>
      <g className="nova-body">
        <rect x="30" y="64" width="18" height="34" rx="8" fill="#a9b9d8" />
        <rect x="38" y="62" width="44" height="46" rx="18" fill="url(#nv-suit)" />
        <rect x="50" y="76" width="20" height="14" rx="4" fill="#ffd36b" />
        <circle cx="55" cy="83" r="2" fill="#ff7ab8" /><circle cx="63" cy="83" r="2" fill="#22d3ee" />
        <g className="nova-arm-l"><rect x="22" y="66" width="14" height="30" rx="7" fill="url(#nv-suit)" /><circle cx="29" cy="98" r="7" fill="#ff9ec9" /></g>
        <g className="nova-arm-r"><rect x="84" y="66" width="14" height="30" rx="7" fill="url(#nv-suit)" /><circle cx="91" cy="98" r="7" fill="#ff9ec9" /></g>
        <rect x="42" y="104" width="14" height="22" rx="7" fill="url(#nv-suit)" /><rect x="64" y="104" width="14" height="22" rx="7" fill="url(#nv-suit)" />
        <circle cx="60" cy="38" r="30" fill="url(#nv-suit)" />
        <rect x="38" y="22" width="44" height="34" rx="17" fill="url(#nv-visor)" />
        <path d="M44 30 Q52 24 60 27" stroke="#fff" strokeOpacity=".7" strokeWidth="3" fill="none" strokeLinecap="round" />
        <g className="nova-face">
          <circle cx="51" cy="40" r="3.4" fill="#e0f7ff" /><circle cx="69" cy="40" r="3.4" fill="#e0f7ff" />
          <path className="nova-smile" d="M52 47 Q60 53 68 47" stroke="#e0f7ff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </g>
        <circle cx="60" cy="8" r="4" fill="#ff7ab8" className="nova-beacon" />
      </g>
    </svg>
  );
}

/** A planet with a friendly face. mood: idle | happy | sad | cheer */
export function PlanetBuddy({ planet = "Earth", size = 76, mood = "idle", className = "" }) {
  const [light, dark] = PLANET_COLORS[planet] || PLANET_COLORS.Earth;
  const id = `pb-${planet}`;
  const mouth = { happy: "M38 58 Q50 70 62 58", cheer: "M36 56 Q50 74 64 56 Z", sad: "M40 64 Q50 56 60 64", idle: "M40 60 Q50 66 60 60" }[mood] || "M40 60 Q50 66 60 60";
  return (
    <svg className={`planet-buddy pb-${mood} ${className}`} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${planet} looks ${mood === "sad" ? "thoughtful" : mood === "idle" ? "curious" : "happy"}`}>
      <defs><radialGradient id={id} cx="32%" cy="28%" r="80%"><stop offset="0" stopColor={light} /><stop offset="1" stopColor={dark} /></radialGradient></defs>
      {planet === "Saturn" && <ellipse cx="50" cy="54" rx="48" ry="12" fill="none" stroke="#e8d3a2" strokeWidth="5" opacity=".85" />}
      <circle cx="50" cy="50" r="34" fill={`url(#${id})`} />
      {planet === "Jupiter" && <><path d="M18 42 Q50 36 82 42" stroke="#a0643c" strokeWidth="4" fill="none" opacity=".45" /><ellipse cx="66" cy="62" rx="7" ry="4" fill="#c4553a" opacity=".7" /></>}
      {planet === "Earth" && <path d="M30 34 q8 -6 14 2 q-4 8 -12 6z M58 64 q10 -4 14 4 q-8 6 -14 -4z" fill="#3fbf7a" opacity=".85" />}
      <ellipse cx="38" cy="30" rx="10" ry="6" fill="#fff" opacity=".35" />
      <g className="pb-eyes">
        {mood === "cheer" ? <><path d="M34 46 q4 -6 8 0" stroke="#1a1f3a" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M58 46 q4 -6 8 0" stroke="#1a1f3a" strokeWidth="3" fill="none" strokeLinecap="round" /></>
          : <><ellipse cx="38" cy="46" rx="4" ry="5" fill="#1a1f3a" /><ellipse cx="62" cy="46" rx="4" ry="5" fill="#1a1f3a" /><circle cx="39.5" cy="44" r="1.5" fill="#fff" /><circle cx="63.5" cy="44" r="1.5" fill="#fff" /></>}
      </g>
      <path d={mouth} stroke="#1a1f3a" strokeWidth="3" fill={mood === "cheer" ? "#ff7a9a" : "none"} strokeLinecap="round" />
      <ellipse cx="30" cy="56" rx="5" ry="3" fill="#ff8fb3" opacity=".55" /><ellipse cx="70" cy="56" rx="5" ry="3" fill="#ff8fb3" opacity=".55" />
    </svg>
  );
}

/** Full-screen loading moment with Nova floating past. */
export function NovaLoading({ text = "Preparing your space adventure…" }) {
  return (
    <div className="nova-loading" role="status">
      <div className="nova-loading-orbit"><NovaAstronaut size={96} mood="wave" /></div>
      <p>{text}</p>
      <span className="nova-loading-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}

/** Space-portal transition shown when a mission starts. */
export function PortalTransition({ planet, onDone }) {
  return (
    <div className="space-portal" aria-hidden="true" onAnimationEnd={(e) => { if (e.target === e.currentTarget) onDone?.(); }}>
      <div className="portal-ring r1" /><div className="portal-ring r2" /><div className="portal-ring r3" />
      <div className="portal-core"><PlanetBuddy planet={planet} size={110} mood="cheer" /></div>
      <p className="portal-text">Landing on {planet}…</p>
    </div>
  );
}
