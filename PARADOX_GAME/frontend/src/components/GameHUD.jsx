import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Flame, Star, Gift, Check } from "lucide-react";
import { API_BASE_URL, useAuth } from "../context/AuthContext";
import { authFetch } from "../services/api";
import { emitFx } from "../audio/fxBus";
import AstronautAvatar from "./AstronautAvatar";
import { AVATAR_EVENT, loadAvatar } from "../avatar/avatarStore";

const XP_PER_LEVEL = 250; // same formula the Account Dashboard already uses
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function updateStreak(userId) {
  const key = `paradox_streak_${userId}`;
  const today = dayKey();
  let data = { last: "", count: 0 };
  try { data = { ...data, ...JSON.parse(localStorage.getItem(key) || "{}") }; } catch { /* ignore */ }
  if (data.last !== today) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    data = { last: today, count: data.last === dayKey(y) ? data.count + 1 : 1 };
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
  }
  return data.count;
}

// Game-style status bar. Read-only: it only reads /api/account/summary, exactly like the dashboard does.
export default function GameHUD() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [doneToday, setDoneToday] = useState(false);
  const [streak, setStreak] = useState(1);
  const [gain, setGain] = useState(0);
  const [avatar, setAvatar] = useState(null);
  const prev = useRef({ xp: null, level: null, ach: null });
  const dailyCelebrated = useRef(false);
  const { pathname } = useLocation();
  const hiddenHere = pathname.startsWith("/account") || pathname.startsWith("/mission/");

  const load = useCallback(async () => {
    if (!token || !user) return;
    try {
      const res = await authFetch(`${API_BASE_URL}/api/account/summary`);
      if (!res.ok) return;
      const data = await res.json();
      const s = data.stats || {};
      const xp = s.xp || 0;
      const level = Math.floor(xp / XP_PER_LEVEL) + 1;
      const today = dayKey();
      const finishedToday = [...(data.history || []), ...(data.quiz_history || [])].some((r) => r.completed_at && dayKey(new Date(r.completed_at)) === today);

      const baseKey = `paradox_hud_${user.id}`;
      let base = {};
      try { base = JSON.parse(localStorage.getItem(baseKey) || "{}"); } catch { /* ignore */ }
      const known = prev.current.xp !== null ? prev.current : { xp: base.xp ?? null, level: base.level ?? null, ach: base.ach ?? null };
      const unlocked = (data.achievements || []).filter((a) => a.unlocked);

      if (known.xp !== null && xp > known.xp) {
        setGain(xp - known.xp);
        window.setTimeout(() => setGain(0), 2600);
        emitFx("xp", { amount: xp - known.xp });
      }
      if (known.level !== null && level > known.level) emitFx("levelup", { level });
      if (known.ach !== null) {
        unlocked.filter((a) => !known.ach.includes(a.id)).forEach((a, i) => window.setTimeout(() => emitFx("achievement", { name: a.name, description: a.description }), 1800 + i * 2600));
      }
      if (finishedToday && !doneToday && known.xp !== null && !dailyCelebrated.current && base.daily !== today) {
        dailyCelebrated.current = true;
        window.setTimeout(() => emitFx("achievement", { name: "Daily Mission Complete!", description: "You finished today's mission. See you tomorrow!" }), 1200);
      }
      const next = { xp, level, ach: unlocked.map((a) => a.id), daily: finishedToday ? today : base.daily };
      prev.current = next;
      try { localStorage.setItem(baseKey, JSON.stringify(next)); } catch { /* ignore */ }
      setStats({ xp, level, missions: s.missions_successful || 0, badges: s.achievement_count || 0 });
      setDoneToday(finishedToday);
    } catch { /* backend offline: HUD simply stays hidden */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  useEffect(() => {
    if (!user) { setStats(null); prev.current = { xp: null, level: null, ach: null }; return undefined; }
    setStreak(updateStreak(user.id));
    setAvatar(loadAvatar(user.id));
    const onAvatar = () => setAvatar(loadAvatar(user.id));
    window.addEventListener(AVATAR_EVENT, onAvatar);
    load();
    window.addEventListener("paradox:progress-updated", load);
    return () => { window.removeEventListener("paradox:progress-updated", load); window.removeEventListener(AVATAR_EVENT, onAvatar); };
  }, [user, load]);

  // The dashboard and the mission screen already show level, XP and score,
  // so the floating bar is hidden there to avoid duplicated, overlapping bars.
  if (!user || !stats || hiddenHere) return null;
  const into = stats.xp % XP_PER_LEVEL;
  const pct = Math.max(4, (into / XP_PER_LEVEL) * 100);

  return (
    <aside className="game-hud" aria-label="Your explorer progress">
      {avatar && <div className="hud-avatar" aria-hidden="true"><AstronautAvatar avatar={avatar} size={46} showRocket={false} /></div>}
      <div className="hud-level" title={`Level ${stats.level}`}><span>LV</span><b>{stats.level}</b></div>
      <div className="hud-xp" title={`${into} / ${XP_PER_LEVEL} XP to next level`}>
        <div className="hud-xp-bar"><i style={{ width: `${pct}%` }} /></div>
        <small>{into}/{XP_PER_LEVEL} XP</small>
        {gain > 0 && <em className="hud-gain">+{gain} XP</em>}
      </div>
      <div className="hud-chip hud-streak" title={`${streak}-day streak`}><Flame size={15} /> {streak}</div>
      <div className="hud-chip hud-stars" title="Missions saved"><Star size={15} /> {stats.missions}</div>
      <div className={`hud-chip hud-daily ${doneToday ? "done" : ""}`} title={doneToday ? "Daily mission done!" : "Daily mission: finish 1 mission today"}>
        {doneToday ? <Check size={15} /> : <Gift size={15} />}<span>{doneToday ? "Done!" : "Daily"}</span>
      </div>
    </aside>
  );
}
