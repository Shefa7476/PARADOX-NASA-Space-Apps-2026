import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LOW_ENERGY, getEnergy, markPrompted, startEnergyTracking, subscribeEnergy } from "../services/energy";
import { SMASH_TARGETS } from "../data/smashTargets";
import { PlanetBuddy } from "./Cartoons";
import { play } from "../audio/sfx";

const face = (v) => (v > 70 ? "😄" : v > 45 ? "🙂" : v > LOW_ENERGY ? "😐" : v > 10 ? "😫" : "🥱");

/** Small "Space Energy" bar in the navbar. When it runs low, a Smash Break opens. */
export default function EnergyBar() {
  const { user } = useAuth();
  const [energy, setEnergy] = useState(getEnergy());
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { startEnergyTracking(); return subscribeEnergy(setEnergy); }, []);

  useEffect(() => {
    if (!user || energy.prompted || energy.value > LOW_ENERGY || location.pathname.startsWith("/planet-smash")) return;
    // Wait until the current answer/feedback has been seen, then offer a break.
    const id = window.setTimeout(() => { markPrompted(); setOpen("tired"); play("pop"); }, 1500);
    return () => window.clearTimeout(id);
  }, [energy.value, energy.prompted, user, location.pathname]);

  if (!user) return null;
  const v = Math.round(energy.value);
  const level = v > 60 ? "high" : v > LOW_ENERGY ? "mid" : "low";
  return (
    <>
      <button type="button" className={`energy-bar energy-${level}`} onClick={() => setOpen("manual")}
        aria-label={`Space energy ${v} percent. Open Smash Break`} title="Space Energy: tap for a Smash Break">
        <span className="energy-face" aria-hidden="true">{face(v)}</span>
        <span className="energy-track" aria-hidden="true"><i style={{ width: `${v}%` }} /></span>
        <span className="energy-num">{v}%</span>
      </button>
      {open && <SmashBreak tired={open === "tired" || v <= LOW_ENERGY} onClose={() => setOpen(false)} />}
    </>
  );
}

export function SmashBreak({ tired, onClose }) {
  const navigate = useNavigate();
  const firstRef = useRef(null);
  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function go(target) {
    play("launch");
    onClose();
    navigate(target ? `/planet-smash?target=${encodeURIComponent(target)}` : "/planet-smash");
  }

  // Portal to <body>: the navbar's backdrop-filter would otherwise trap this fixed overlay.
  return createPortal(
    <div className="smash-break-backdrop" role="dialog" aria-modal="true" aria-labelledby="smash-break-title" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="smash-break">
        <div className="sb-head">
          <span className="sb-battery" aria-hidden="true">{tired ? "🪫" : "🔋"}</span>
          <div>
            <h2 id="smash-break-title">{tired ? "Phew! Your space energy is running low" : "Need a Smash Break?"}</h2>
            <p>{tired ? "You've worked hard, Commander! Pick any planet and blast it with a rocket. It always bounces back, and your energy recharges." : "Pick a planet to crash with your rocket. Smashing recharges your space energy!"}</p>
          </div>
        </div>
        <div className="sb-grid" role="list">
          {SMASH_TARGETS.map((t, i) => (
            <button key={t.id} ref={i === 0 ? firstRef : null} type="button" role="listitem" className="sb-planet" onClick={() => go(t.id)} aria-label={`Crash ${t.id}`}>
              <PlanetBuddy planet={t.id} size={58} mood="idle" />
              <b>{t.id}</b>
            </button>
          ))}
          <button type="button" role="listitem" className="sb-planet sb-all" onClick={() => go(null)} aria-label="Crash all the planets">
            <span aria-hidden="true">🌌</span><b>All of them!</b>
          </button>
        </div>
        <div className="sb-actions">
          <button type="button" className="mp-btn ghost" onClick={onClose}>{tired ? "I'm okay, keep learning" : "Not now"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
