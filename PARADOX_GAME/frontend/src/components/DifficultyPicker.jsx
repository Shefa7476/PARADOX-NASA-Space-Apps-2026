import { CircleCheckBig } from "lucide-react";

export const DIFFICULTY_INFO = {
  Easy: { label: "Easy", icon: "🌱", blurb: "3 choices · space basics", detail: "Beginner-friendly questions with simple words and helpful explanations." },
  Medium: { label: "Medium", icon: "🚀", blurb: "4 choices · more reasoning", detail: "Intermediate questions that ask you to connect ideas." },
  Hard: { label: "Hard", icon: "🧠", blurb: "4 choices · real challenge", detail: "Advanced problem-solving with detailed science explanations." },
};
export const LEVELS = Object.keys(DIFFICULTY_INFO);

/** Accessible difficulty picker. Every level is always clickable (mouse, touch and keyboard). */
export default function DifficultyPicker({ value, onChange, compact = false, name = "difficulty", counts = null, recommended = null }) {
  function onKeyDown(event) {
    const index = LEVELS.indexOf(value);
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = LEVELS[(index + delta + LEVELS.length) % LEVELS.length];
    onChange(next);
    event.currentTarget.querySelector(`[data-level="${next}"]`)?.focus();
  }
  return (
    <div className={`difficulty-picker ${compact ? "compact" : ""}`} role="radiogroup" aria-label="Mission difficulty" onKeyDown={onKeyDown}>
      {LEVELS.map((level) => {
        const info = DIFFICULTY_INFO[level];
        const active = value === level;
        return (
          <button key={level} type="button" role="radio" aria-checked={active} tabIndex={active ? 0 : -1}
            data-level={level} name={name} className={`difficulty-option level-${level.toLowerCase()} ${active ? "active" : ""}`}
            onClick={() => onChange(level)}>
            <span className="d-icon" aria-hidden="true">{info.icon}</span>
            <span className="d-copy">
              <b>{info.label}</b>
              <small>{info.blurb}</small>
              {(counts || recommended === level) && (
                <span className="d-meta">
                  {recommended === level && <em className="d-rec">Recommended</em>}
                  {counts && <em className={`d-count ${counts[level] === 0 ? "empty" : ""}`}>{counts[level] === 0 ? "All seen" : `${counts[level] >= 40 ? "40+" : counts[level]} new`}</em>}
                </span>
              )}
            </span>
            {active && <CircleCheckBig className="d-check" size={16} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

