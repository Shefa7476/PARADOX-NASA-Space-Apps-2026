import { createPortal } from "react-dom";
import { LockKeyhole, Rocket, Sparkles, Trophy, CircleX } from "lucide-react";
import "../styles/mission-outcome.css";

export default function MissionOutcomeOverlay({
  open,
  success,
  title,
  description,
  onPrimary,
  primaryLabel,
  onSecondary,
  secondaryLabel = "Return to dashboard",
  saving = false,
}) {
  if (!open) return null;

  return createPortal(
    <div className={`mission-outcome-backdrop ${success ? "outcome-success" : "outcome-failure"}`} role="dialog" aria-modal="true" aria-labelledby="mission-outcome-title">
      <div className="outcome-stars" />
      <div className="outcome-orbit outcome-orbit-one" />
      <div className="outcome-orbit outcome-orbit-two" />
      <div className="outcome-panel">
        <div className="outcome-visual">
          {success ? <><Trophy className="outcome-trophy" size={64} /><Sparkles className="outcome-spark outcome-spark-one" /><Sparkles className="outcome-spark outcome-spark-two" /></> : <><Rocket className="outcome-escape-rocket" size={66} /><CircleX className="outcome-failure-mark" size={25} /></>}
        </div>
        <span className="outcome-eyebrow">{success ? "MISSION CONTROL · VICTORY SIGNAL" : "MISSION CONTROL · EMERGENCY EJECTION"}</span>
        <h2 id="mission-outcome-title">{title || (success ? "MISSION COMPLETE!" : "MISSION FAILED")}</h2>
        <p>{description || (success ? "Brilliant work, Commander! Your decisions helped the crew reach safety." : "The mission did not go to plan. Your escape pod is returning to orbit. Try again, space explorer!")}</p>
        <div className="outcome-status-line"><span className="outcome-status-dot" />{success ? "Planetary objectives achieved" : "Safe return route active"}</div>
        <div className="outcome-actions">
          <button type="button" className="outcome-primary" onClick={onPrimary} disabled={saving}>{saving ? "Saving mission…" : (primaryLabel || (success ? "Continue the adventure" : "Return to planet"))}</button>
          {onSecondary && <button type="button" className="outcome-secondary" onClick={onSecondary}>{secondaryLabel}</button>}
        </div>
        {saving && <small className="outcome-saving"><LockKeyhole size={12} /> Saving your explorer progress securely</small>}
        {success && <div className="outcome-confetti" aria-hidden="true">✦　✧　★　✦　✧　★　✦</div>}
      </div>
    </div>,
    document.body
  );
}
