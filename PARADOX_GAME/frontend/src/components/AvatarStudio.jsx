import { useEffect, useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { API_BASE_URL, useAuth } from "../context/AuthContext";
import { authFetch } from "../services/api";
import { BADGES, ROCKETS, SUITS, loadAvatar, saveAvatar } from "../avatar/avatarStore";
import { emitFx } from "../audio/fxBus";
import AstronautAvatar from "./AstronautAvatar";

// Profile-page customiser. Items unlock with the same level the HUD shows (250 XP per level).
export default function AvatarStudio() {
  const { user } = useAuth();
  const [avatar, setAvatar] = useState(() => loadAvatar(user?.id));
  const [level, setLevel] = useState(1);

  useEffect(() => {
    let active = true;
    authFetch(`${API_BASE_URL}/api/account/summary`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d) setLevel(Math.floor((d.stats?.xp || 0) / 250) + 1); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  function pick(field, item) {
    if (item.lvl > level) { emitFx("avatar-locked", { lvl: item.lvl }); return; }
    const next = { ...avatar, [field]: item.id };
    setAvatar(next);
    saveAvatar(user.id, next);
    emitFx("avatar");
  }

  const group = (title, field, list, render) => (
    <div className="avatar-group">
      <h3>{title}</h3>
      <div className="avatar-options">
        {list.map((item) => {
          const locked = item.lvl > level;
          return (
            <button key={item.id} type="button" className={`avatar-option ${avatar[field] === item.id ? "selected" : ""} ${locked ? "locked" : ""}`} onClick={() => pick(field, item)} title={locked ? `Unlocks at Level ${item.lvl}` : item.name} aria-pressed={avatar[field] === item.id} aria-label={`${item.name}${locked ? `, unlocks at level ${item.lvl}` : ""}`}>
              {render(item)}
              {locked && <span className="avatar-lock"><Lock size={12} /> {item.lvl}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="avatar-studio profile-panel mt-8">
      <div className="avatar-preview">
        <div className="avatar-stage"><AstronautAvatar avatar={avatar} size={190} /></div>
        <p className="auth-eyebrow"><Sparkles size={13} /> YOUR ASTRONAUT</p>
        <small>Level {level} · reach new levels to unlock more!</small>
      </div>
      <div className="avatar-controls">
        <h2>Customise your astronaut</h2>
        {group("Space suit", "suit", SUITS, (i) => <span className="swatch" style={{ background: i.color }} />)}
        {group("Chest badge", "badge", BADGES, (i) => <span className="emoji">{i.icon}</span>)}
        {group("Rocket skin", "rocket", ROCKETS, (i) => <span className="swatch rocket-swatch" style={{ background: i.color }} />)}
      </div>
    </section>
  );
}
