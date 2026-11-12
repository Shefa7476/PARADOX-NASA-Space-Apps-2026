// Lightweight CSS-only sky layer: twinkling constellations, drifting particles
// and an occasional shooting star. Purely decorative and never clickable
// (pointer-events: none). Disabled automatically for reduced motion.
const CONSTELLATIONS = [
  { x: 8, y: 22, pts: [[0, 0], [5, 3], [9, 1], [13, 6], [17, 4]] },
  { x: 72, y: 14, pts: [[0, 4], [4, 0], [8, 3], [6, 9], [11, 11]] },
  { x: 82, y: 68, pts: [[0, 0], [3, 5], [8, 6], [12, 2]] },
];

export default function CosmicBackdrop() {
  return (
    <div className="cosmic-backdrop" aria-hidden="true">
      {CONSTELLATIONS.map((c, ci) => (
        <svg key={ci} className="constellation" style={{ left: `${c.x}%`, top: `${c.y}%`, animationDelay: `${ci * 2.3}s` }} viewBox="-1 -1 20 14" width="180" height="126">
          <polyline points={c.pts.map((p) => p.join(",")).join(" ")} />
          {c.pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="0.45" style={{ animationDelay: `${(i * 0.7 + ci) % 4}s` }} />)}
        </svg>
      ))}
      <span className="shooting-star s1" />
      <span className="shooting-star s2" />
      <span className="shooting-star s3" />
      <div className="bd-ufo">
        <svg viewBox="0 0 120 80" width="96" height="64">
          <path d="M38 40 L20 80 L100 80 L82 40 Z" fill="rgba(167,243,208,.18)" className="bd-beam" />
          <ellipse cx="60" cy="30" rx="20" ry="16" fill="#a7f3d0" opacity=".85" />
          <circle cx="60" cy="30" r="8" fill="#86efac" /><circle cx="57" cy="28" r="2" fill="#1a1f3a" /><circle cx="63" cy="28" r="2" fill="#1a1f3a" />
          <path d="M57 33 Q60 35.5 63 33" stroke="#1a1f3a" strokeWidth="1.4" fill="none" />
          <ellipse cx="60" cy="40" rx="44" ry="11" fill="#a5b4fc" /><ellipse cx="60" cy="37" rx="44" ry="6" fill="#c7d2fe" />
          {[24, 42, 60, 78, 96].map((x, i) => <circle key={x} cx={x} cy="42" r="3" fill={["#fde68a", "#f472b6", "#67e8f9"][i % 3]} className="bd-light" style={{ animationDelay: `${i * 0.15}s` }} />)}
        </svg>
      </div>
      <div className="bd-alien">
        <svg viewBox="0 0 80 90" width="64" height="72">
          <line x1="28" y1="14" x2="22" y2="2" stroke="#86efac" strokeWidth="3" /><circle cx="22" cy="2" r="4" fill="#f472b6" />
          <line x1="52" y1="14" x2="58" y2="2" stroke="#86efac" strokeWidth="3" /><circle cx="58" cy="2" r="4" fill="#f472b6" />
          <ellipse cx="40" cy="40" rx="28" ry="26" fill="#86efac" />
          <ellipse cx="30" cy="38" rx="7" ry="9" fill="#fff" /><ellipse cx="50" cy="38" rx="7" ry="9" fill="#fff" />
          <circle cx="31" cy="40" r="4" fill="#1a1f3a" /><circle cx="51" cy="40" r="4" fill="#1a1f3a" />
          <path d="M32 52 Q40 59 48 52" stroke="#1a1f3a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <g className="bd-alien-hand"><circle cx="74" cy="56" r="7" fill="#86efac" /></g>
          <rect x="16" y="62" width="48" height="30" rx="14" fill="#86efac" />
        </svg>
      </div>
      <div className="bd-satellite-orbit"><span className="bd-satellite">🛰️</span></div>
      <span className="comet c1" />
      <span className="comet c2" />
      <span className="cosmic-glow g1" />
      <span className="cosmic-glow g2" />
    </div>
  );
}
