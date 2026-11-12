import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Award, Compass, Crown, GraduationCap, Printer, Rocket, Star, Target, Trophy } from "lucide-react";
import { API_BASE_URL, useAuth } from "../context/AuthContext";
import TutorialReplayButton from "../components/TutorialReplayButton";
import "../styles/solar-system.css";

const iconMap = { rocket: Rocket, shield: Target, orbit: Compass, star: Star, sun: Star, award: Award };
const PLANETS = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];
const XP_PER_LEVEL = 250;

export default function AccountDashboard() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    let active = true;
    const load = () => fetch(`${API_BASE_URL}/api/account/summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.detail || "Could not load explorer dashboard."); return data; })
      .then((data) => { if (active) { setSummary(data); setError(""); } })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    const loadInsights = () => fetch(`${API_BASE_URL}/api/learning/insights`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (active && d) setInsights(d); }).catch(() => {});
    load();
    loadInsights();
    window.addEventListener("paradox:progress-updated", load);
    window.addEventListener("paradox:progress-updated", loadInsights);
    return () => { active = false; window.removeEventListener("paradox:progress-updated", load); window.removeEventListener("paradox:progress-updated", loadInsights); };
  }, [token]);

  const stats = summary?.stats || {};
  const progression = summary?.progression;
  const xp = stats.xp || 0;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const levelProgress = ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;
  const planets = progression?.planets || [];
  const nextIndex = planets.findIndex((p) => p.unlocked && !p.completed);
  const next = nextIndex >= 0 ? { ...planets[nextIndex], name: PLANETS[nextIndex], number: nextIndex + 1 } : null;
  const achievements = summary?.achievements || [];
  const sortedBadges = [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  const badges = showAllBadges ? sortedBadges : sortedBadges.slice(0, 6);

  return <main className="account-page dash-clean mx-auto max-w-6xl px-5 py-8 md:px-8">
    <section className="dash-hero">
      <div className="dash-hero-copy">
        <p className="auth-eyebrow">EXPLORER COMMAND CENTER</p>
        <h1>Welcome back, {user?.display_name || "Explorer"}!</h1>
        <p>Pick up where you left off, or explore something new.</p>
      </div>
      <div className="dash-level" aria-label={`Level ${level}, ${xp} XP`}>
        <Crown size={22} />
        <div><span>LEVEL {level}</span><b>{xp} XP</b></div>
        <i className="dash-level-bar"><em style={{ width: `${levelProgress}%` }} /></i>
        <small>{XP_PER_LEVEL - (xp % XP_PER_LEVEL)} XP to level {level + 1}</small>
      </div>
    </section>

    {error && <p className="mt-6 text-rose-300">{error}</p>}
    {loading ? <p className="mt-10 text-cyan-200">Loading your mission records…</p> : <>
      <section className="dash-next">
        {next ? (
          <Link to={`/missions?planet=${next.number}`} className="dash-next-card">
            <span className={`dash-next-planet planet-sphere planet-${next.number}`} aria-hidden="true"><i className="planet-light" /></span>
            <div><small>YOUR NEXT MISSION</small><b>{next.name}</b><span>{next.completed_scenarios}/{next.total_scenarios} adventures complete</span></div>
            <span className="dash-next-go">Continue <ArrowRight size={18} /></span>
          </Link>
        ) : (
          <Link to={progression?.beyond_neptune_unlocked ? "/missions?planet=9" : "/missions"} className="dash-next-card">
            <span className="dash-next-planet planet-sphere planet-9" aria-hidden="true" />
            <div><small>{progression?.beyond_neptune_unlocked ? "ALL PLANETS COMPLETE" : "START EXPLORING"}</small><b>{progression?.beyond_neptune_unlocked ? "Kuiper Belt bonus" : "Solar System"}</b><span>{progression?.beyond_neptune_unlocked ? "Try the Cosmic Speed Quiz" : "Choose your first world"}</span></div>
            <span className="dash-next-go">Go <ArrowRight size={18} /></span>
          </Link>
        )}
        <div className="dash-quick">
          <Link to="/space-academy"><GraduationCap size={16} /> Space Academy</Link>
          <Link to="/certificate"><Printer size={16} /> Certificate</Link>
          <TutorialReplayButton />
        </div>
      </section>

      <section className="dash-stats">
        <div><Trophy /><strong>{stats.missions_successful || 0}<small>/{stats.missions_attempted || 0}</small></strong><span>Missions won</span></div>
        <div><Award /><strong>{stats.achievement_count || 0}<small>/{achievements.length}</small></strong><span>Badges</span></div>
        <div><Star /><strong>{stats.quiz_best_score || 0}<small>/10</small></strong><span>Best quiz score</span></div>
      </section>

      {insights && (
        <section className="dash-section" aria-labelledby="insights-title">
          <div className="dash-section-head"><div><p className="auth-eyebrow">Learning insights</p><h2 id="insights-title" className="account-section-title">How you're learning</h2></div>
            <span className="dash-muted">{insights.total_answered} questions answered</span></div>
          <div className="insights-grid">
            <div className="insight-card insight-rec">
              <span className={`level-pill level-${insights.recommended_level.level.toLowerCase()}`}>{{ Easy: "🌱", Medium: "🚀", Hard: "🧠" }[insights.recommended_level.level]} {insights.recommended_level.level}</span>
              <b>Recommended level</b>
              <p>{insights.recommended_level.reason}</p>
            </div>
            <div className="insight-card">
              <b>Accuracy by level</b>
              {["Easy", "Medium", "Hard"].map((lvl) => {
                const st = insights.by_level[lvl];
                return (
                  <div key={lvl} className={`insight-bar level-${lvl.toLowerCase()}`}>
                    <span>{{ Easy: "🌱", Medium: "🚀", Hard: "🧠" }[lvl]} {lvl}</span>
                    <i><em style={{ width: `${st.accuracy ?? 0}%` }} /></i>
                    <small>{st.answered ? `${st.accuracy}% · ${st.correct}/${st.answered}` : "Not played yet"}</small>
                  </div>
                );
              })}
            </div>
            <div className="insight-card">
              <b>Topics</b>
              {insights.strong_topics.length === 0 && insights.practice_topics.length === 0 && <p className="dash-muted">Answer a few more questions to see your strongest topics.</p>}
              {insights.strong_topics.map((t) => <p key={t.topic} className="topic-row strong">✓ <span>{t.topic}</span> <small>{t.accuracy}%</small></p>)}
              {insights.practice_topics.map((t) => <p key={t.topic} className="topic-row practice">↻ <span>{t.topic}</span> <small>{t.accuracy}% · practise</small></p>)}
            </div>
          </div>
        </section>
      )}

      <section className="dash-section">
        <div className="dash-section-head"><div><p className="auth-eyebrow">YOUR JOURNEY</p><h2 className="account-section-title">Planet progress</h2></div></div>
        <div className="dash-planets">
          {planets.map((planet, index) => (
            <Link key={planet.mission_id} to={planet.unlocked ? `/missions?planet=${index + 1}` : "/missions"} className={`dash-planet ${planet.completed ? "complete" : planet.unlocked ? "current" : "locked"}`} aria-label={`${PLANETS[index]}: ${planet.completed ? "complete" : planet.unlocked ? `${planet.completed_scenarios} of ${planet.total_scenarios} adventures` : "locked"}`}>
              <span className={`planet-sphere planet-${index + 1}`} aria-hidden="true"><i className="planet-light" /></span>
              <b>{PLANETS[index]}</b>
              <i className="dash-planet-bar"><em style={{ width: `${planet.total_scenarios ? planet.completed_scenarios / planet.total_scenarios * 100 : 0}%` }} /></i>
              <small>{planet.completed ? "★ Complete" : planet.unlocked ? `${planet.completed_scenarios}/${planet.total_scenarios}` : "🔒 Locked"}</small>
            </Link>
          ))}
        </div>
        {progression?.beyond_neptune_unlocked && <div className="kuiper-unlocked-banner">♇ KUIPER BELT UNLOCKED · COSMIC SPEED QUIZ AVAILABLE</div>}
      </section>

      <section className="dash-section">
        <div className="dash-section-head">
          <div><p className="auth-eyebrow">YOUR COLLECTION</p><h2 className="account-section-title">Achievements</h2></div>
          {achievements.length > 6 && <button type="button" className="dash-link" onClick={() => setShowAllBadges((v) => !v)}>{showAllBadges ? "Show fewer" : `Show all ${achievements.length}`}</button>}
        </div>
        <div className="achievement-grid">{badges.map((achievement) => { const Icon = iconMap[achievement.icon] || Award; return <article key={achievement.id} className={`achievement-item ${achievement.unlocked ? "unlocked" : "locked"}`}><span><Icon size={22} /></span><div><h3>{achievement.name}</h3><p>{achievement.description}</p></div><b>{achievement.unlocked ? "EARNED" : "LOCKED"}</b></article>; })}</div>
      </section>

      <section className="dash-section">
        <div className="dash-section-head"><div><p className="auth-eyebrow">FLIGHT LOG</p><h2 className="account-section-title">Recent missions</h2></div></div>
        {summary?.history?.length ? <div className="history-table">{summary.history.slice(0, 6).map((item) => <div key={item.id} className="history-row"><div><strong>{item.mission_title}</strong><span>{item.scenario_name} · {item.difficulty}</span></div><div className="history-result"><b className={item.status === "SUCCESS" ? "text-emerald-300" : "text-amber-300"}>{item.status === "SUCCESS" ? "Success" : "Try again"}</b><span>+{item.xp} XP</span></div></div>)}</div> : <div className="empty-history"><span className="empty-orbit"><Compass size={30} /></span><h3>Your flight log is waiting</h3><p>Complete your first mission to record it here and earn your first XP.</p><Link to="/missions">Choose your first planet →</Link></div>}
      </section>
    </>}
  </main>;
}
