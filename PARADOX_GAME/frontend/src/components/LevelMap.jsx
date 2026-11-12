import { useEffect, useRef } from "react";
import { Check, Lock, Rocket, Star } from "lucide-react";

// Candy-Crush style level map. Purely a different way to SHOW the same planets:
// it receives progress + callbacks from the Solar System page and changes no game data.
const W = 400;
const STEP = 165;
const TOP = 95;
const XS = [200, 105, 290, 112, 292, 108, 290, 135, 205];

function sizeFor(id) { return id === 5 || id === 6 ? 84 : id === 1 || id === 2 || id === 9 ? 58 : 70; }

function buildPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const m = (b.y - a.y) / 2;
    d += ` C ${a.x} ${a.y + m}, ${b.x} ${b.y - m}, ${b.x} ${b.y}`;
  }
  return d;
}

export default function LevelMap({ planets, getProgress, isUnlocked, onSelect, disabled }) {
  const currentRef = useRef(null);
  const H = TOP * 2 + STEP * (planets.length - 1);
  const pts = planets.map((p, i) => ({ x: XS[i % XS.length], y: TOP + i * STEP, p }));

  const state = (p) => {
    const prog = getProgress(p);
    const unlocked = isUnlocked(p);
    const done = !p.bonus && Boolean(prog?.completed);
    return { prog, unlocked, done, current: unlocked && !done };
  };

  // the "you are here" planet = the furthest unlocked one that isn't complete
  const states = pts.map(({ p }) => state(p));
  let currentIdx = -1;
  states.forEach((s, i) => { if (s.current) currentIdx = i; });
  const reachedIdx = Math.max(currentIdx, states.reduce((m, s, i) => (s.done ? Math.max(m, i + 1) : m), 0));

  useEffect(() => {
    const el = currentRef.current;
    if (currentIdx > 1 && el?.scrollIntoView) el.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [currentIdx]);

  return (
    <section className="level-map" aria-label="Level map of planets">
      <div className="level-map-canvas" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="level-map-svg" aria-hidden="true">
          <path d={buildPath(pts)} className="lm-road-glow" />
          <path d={buildPath(pts)} className="lm-road" />
          <path d={buildPath(pts.slice(0, Math.max(1, reachedIdx + 1)))} className="lm-road-done" />
        </svg>

        {pts.map(({ x, y, p }, i) => {
          const s = states[i];
          const stars = Math.min(3, s.prog?.completed_scenarios || 0);
          const size = sizeFor(p.id);
          const cls = s.done ? "done" : s.current ? "current" : s.unlocked ? "open" : "locked";
          return (
            <button
              key={p.id}
              ref={s.current && i === currentIdx ? currentRef : null}
              type="button"
              disabled={disabled}
              className={`lm-node lm-${cls}`}
              style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%`, "--lm-size": `${size}px`, "--lm-delay": `${i * 70}ms` }}
              onClick={() => onSelect(p.id)}
              aria-label={`${p.name}: ${s.done ? "complete" : s.current ? "your next destination" : s.unlocked ? "unlocked" : "locked"}`}
            >
              {s.current && <span className="lm-here"><Rocket size={14} /> YOU ARE HERE</span>}
              <span className="lm-planet-wrap">
                <span className={`planet-sphere planet-${p.id}`} style={{ "--planet-color": p.color, "--planet-size": `${size}px` }}>
                  {p.id === 6 && <i className="saturn-rings" />}
                  {p.id === 3 && <i className="earth-land" />}
                  {p.id === 5 && <i className="jupiter-storm" />}
                  {p.id === 9 && <i className="pluto-heart" />}
                  <i className="planet-light" />
                </span>
                {!s.unlocked && <span className="lm-lock"><Lock size={18} /></span>}
                {s.done && <span className="lm-check"><Check size={15} strokeWidth={3.5} /></span>}
              </span>
              <span className="lm-name">{i + 1 <= 8 ? <em>{i + 1}</em> : null}{p.name}</span>
              {p.bonus ? <span className="lm-bonus">BONUS WORLD</span> : (
                <span className="lm-stars" aria-hidden="true">{[0, 1, 2].map((k) => <Star key={k} size={15} className={k < stars ? "on" : ""} />)}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
