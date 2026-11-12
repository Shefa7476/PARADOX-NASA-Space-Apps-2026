import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Activity, TriangleAlert, ArrowLeft, ArrowRight, BookOpen, Bot, CircleCheckBig, ChevronRight,
  Lightbulb, RotateCcw, Sparkles, Target, CircleX,
} from "lucide-react";
import { API_BASE_URL, useAuth } from "../context/AuthContext";
import { authFetch } from "../services/api";
import { openAskAI } from "../services/tutorApi";
import { emitFx } from "../audio/fxBus";
import MissionOutcomeOverlay from "../components/MissionOutcomeOverlay";
import DifficultyPicker, { DIFFICULTY_INFO, LEVELS } from "../components/DifficultyPicker";
import "../styles/mission-play.css";
import { NovaAstronaut, PlanetBuddy, PortalTransition } from "../components/Cartoons";

const API = API_BASE_URL;
const PLANET_NAMES = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];
const RESOURCE_LABELS = { power: "Power", fuel: "Fuel", oxygen: "Oxygen", integrity: "Hull integrity", time: "Time remaining" };

async function apiRequest(path, options = {}) {
  const response = await authFetch(`${API}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(typeof data.detail === "string" ? data.detail : data.detail?.message || "Request failed");
    err.detail = data.detail;
    err.status = response.status;
    throw err;
  }
  return data;
}

export default function Dashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token } = useAuth();
  const requestedScenarioId = Number(searchParams.get("scenario") || 1);
  const requestedDifficulty = searchParams.get("difficulty");
  const initialDifficulty = LEVELS.includes(requestedDifficulty) ? requestedDifficulty : "Easy";
  const shouldAutoStart = searchParams.get("autostart") === "1";
  const autoStartedRef = useRef(false);
  const recordedSessionsRef = useRef(new Set());

  const [mission, setMission] = useState(null);
  const [scenarioId, setScenarioId] = useState(requestedScenarioId);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [session, setSession] = useState(null);
  const [selected, setSelected] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingChange, setPendingChange] = useState(null);
  const [progressSummary, setProgressSummary] = useState(null);
  const [savingProgress, setSavingProgress] = useState(false);
  const [outcomeClosed, setOutcomeClosed] = useState(false);
  const [practice, setPractice] = useState(null); // {items, index, picked, done}
  const [exhausted, setExhausted] = useState(null);
  const [portal, setPortal] = useState(false);
  const [freshCounts, setFreshCounts] = useState(null);
  const [recommended, setRecommended] = useState(null);

  // Read the URL's starting values only when the planet (route id) changes.
  // startMission() rewrites ?difficulty= in place and must not reset the page.
  const initialRef = useRef({ scenario: requestedScenarioId, difficulty: initialDifficulty });
  initialRef.current = { scenario: requestedScenarioId, difficulty: initialDifficulty };

  useEffect(() => {
    let cancelled = false;
    const start = initialRef.current;
    setMission(null);
    setSession(null);
    setScenarioId(Number.isInteger(start.scenario) && start.scenario > 0 ? start.scenario : 1);
    setDifficulty(start.difficulty);
    autoStartedRef.current = false;
    setSelected("");
    setFeedback(null);
    setError("");
    setProgressSummary(null);
    apiRequest(`/api/missions/${id}`)
      .then((data) => { if (!cancelled) setMission(data); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [id]);

  const loadAvailability = useCallback((scenario) => {
    apiRequest(`/api/questions/availability?mission_id=${id}&scenario_id=${scenario}`)
      .then((data) => setFreshCounts(data.fresh || null))
      .catch(() => setFreshCounts(null));
  }, [id]);

  useEffect(() => { loadAvailability(scenarioId); }, [scenarioId, loadAvailability]);
  useEffect(() => { if (session && session.status !== "ACTIVE") loadAvailability(scenarioId); }, [session, scenarioId, loadAvailability]);
  useEffect(() => {
    apiRequest("/api/learning/insights").then((data) => setRecommended(data.recommended_level || null)).catch(() => {});
  }, []);

  const startMission = useCallback(async (overrides = {}) => {
    const nextScenario = overrides.scenarioId ?? scenarioId;
    const nextDifficulty = overrides.difficulty ?? difficulty;
    const review = Boolean(overrides.review);
    setBusy(true);
    setError("");
    setSelected("");
    setFeedback(null);
    setOutcomeClosed(false);
    setPractice(null);
    setPendingChange(null);
    try {
      const data = await apiRequest("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mission_id: Number(id), scenario_id: nextScenario, difficulty: nextDifficulty, review }),
      });
      setSession(data);
      setExhausted(null);
      setPortal(true);
      emitFx("mission-start");
      setScenarioId(nextScenario);
      setDifficulty(nextDifficulty);
      // keep the URL in sync so refresh / back keeps the chosen level
      setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set("scenario", String(nextScenario)); p.set("difficulty", nextDifficulty); p.delete("autostart"); return p; }, { replace: true });
    } catch (err) {
      if (err.status === 409 && err.detail?.code === "POOL_EXHAUSTED") {
        setSession(null);
        setScenarioId(nextScenario);
        setDifficulty(nextDifficulty);
        setExhausted(err.detail);
        loadAvailability(nextScenario);
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }, [id, scenarioId, difficulty, setSearchParams, loadAvailability]);

  useEffect(() => {
    if (!mission || !shouldAutoStart || autoStartedRef.current || session || busy) return;
    const exists = mission.scenarios.some((scenario) => scenario.id === requestedScenarioId);
    if (!exists) return;
    autoStartedRef.current = true;
    startMission({ scenarioId: requestedScenarioId, difficulty: initialDifficulty });
  }, [mission, shouldAutoStart, requestedScenarioId, initialDifficulty, session, busy, startMission]);

  // Save finished missions to the player's account (unchanged behaviour).
  useEffect(() => {
    if (!session || session.status === "ACTIVE" || !token || recordedSessionsRef.current.has(session.session_id)) return;
    recordedSessionsRef.current.add(session.session_id);
    setSavingProgress(true);
    authFetch(`${API}/api/account/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: session.session_id }),
    })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.detail || "Could not save mission progress.");
        setProgressSummary(data.summary || null);
        window.dispatchEvent(new Event("paradox:progress-updated"));
      })
      .catch((err) => setError(err.message))
      .finally(() => setSavingProgress(false));
  }, [session, token]);

  /** Difficulty / stage buttons: always clickable. Mid-mission changes ask first. */
  function requestChange(change) {
    const next = { difficulty: change.difficulty ?? difficulty, scenarioId: change.scenarioId ?? scenarioId };
    if (next.difficulty === difficulty && next.scenarioId === scenarioId && session) return;
    if (!session) {
      setDifficulty(next.difficulty);
      setScenarioId(next.scenarioId);
      return;
    }
    const inProgress = session.status === "ACTIVE" && (session.step > 0 || feedback);
    if (inProgress) { setPendingChange(next); return; }
    setNotice(`Mission restarted at ${next.difficulty} level.`);
    window.setTimeout(() => setNotice(""), 2500);
    startMission(next);
  }

  async function submitAnswer() {
    if (!session || !selected || busy || feedback) return;
    setBusy(true);
    setError("");
    try {
      const data = await apiRequest("/api/session/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.session_id, action_id: selected }),
      });
      setFeedback(data.last_result);
      setSession(data);
      emitFx(data.last_result?.correct ? "correct" : "wrong");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function nextQuestion() {
    setFeedback(null);
    setSelected("");
    const branch = session?.question?.branch;
    if (branch === "follow-up" || branch === "challenge") emitFx(branch);
  }

  const question = feedback ? null : session?.question;
  const options = question?.options || [];

  // Keyboard: 1-4 / A-D to choose, Enter to check or continue.
  useEffect(() => {
    if (!session) return undefined;
    const onKey = (event) => {
      if (event.target.closest?.("input, textarea, select, [contenteditable='true'], .ai-chat, .music-center")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (question) {
        const key = event.key.toUpperCase();
        const index = "1234".includes(key) ? Number(key) - 1 : "ABCD".indexOf(key);
        if (key.length === 1 && index >= 0 && index < options.length) { setSelected(options[index].id); return; }
        if (event.key === "Enter" && selected && !event.target.closest?.("button")) submitAnswer();
      } else if (feedback && event.key === "Enter" && !event.target.closest?.("button")) {
        nextQuestion();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const currentScenario = mission?.scenarios.find((s) => s.id === scenarioId);
  const planetName = session?.planet || PLANET_NAMES[Number(id) - 1] || "Space";
  const isFinished = Boolean(session && session.status !== "ACTIVE");
  const showResults = isFinished && !feedback;

  const aiContext = useMemo(() => {
    const entry = feedback || null;
    return {
      planet: planetName,
      mission: mission?.title || "",
      stage: currentScenario?.name || "",
      difficulty,
      question: entry ? entry.question : question?.text || "",
      question_id: entry ? entry.question_id : question?.id || "",
      topic: entry ? entry.topic : question?.topic || session?.stage_topic || "",
      answered: Boolean(entry),
      your_answer: entry?.action || "",
      correct_answer: entry?.correct_answer || "",
      explanation: entry?.explanation || "",
    };
  }, [feedback, question, planetName, mission, currentScenario, difficulty, session]);

  const currentPlanetProgress = progressSummary?.progression?.planets?.find((planet) => Number(planet.mission_id) === Number(id));
  const nextScenarioId = currentPlanetProgress?.unlocked_scenario_ids?.find((candidate) => candidate > scenarioId);
  const nextDestination = nextScenarioId
    ? `/missions?planet=${id}`
    : currentPlanetProgress?.completed
      ? (Number(id) < 8 ? `/missions?planet=${Number(id) + 1}` : "/missions?planet=9")
      : `/missions?planet=${id}`;

  if (!mission) {
    return <main className="mission-play"><div className="mp-loading">{error || <><span className="loading-orbit" /> Loading mission…</>}</div></main>;
  }

  const history = session?.history || [];
  const total = session?.max_steps || 4;
  const correctCount = history.filter((h) => h.correct).length;
  const missed = history.filter((h) => !h.correct);
  const stars = isFinished ? (correctCount === total ? 3 : session.status === "SUCCESS" ? 2 : correctCount > 0 ? 1 : 0) : 0;

  return (
    <main className="mission-play">
      <div className="mp-topbar">
        <Link to={`/missions?planet=${id}`} className="mp-back"><ArrowLeft size={16} /> Solar System</Link>
        <div className="mp-chips">
          <span className={`mp-chip planet-chip planet-chip-${id}`}>🪐 {planetName}</span>
          {session?.stage_topic && <span className="mp-chip">{session.stage_topic}</span>}
          <span className={`mp-chip level-chip level-${difficulty.toLowerCase()}`}>{DIFFICULTY_INFO[difficulty].icon} {difficulty}</span>
        </div>
      </div>

      <header className="mp-header">
        <PlanetBuddy planet={planetName} size={72} mood={showResults ? (session.status === "SUCCESS" ? "cheer" : "sad") : feedback ? (feedback.correct ? "happy" : "sad") : "idle"} className="mp-buddy" />
        <div>
          <p className="mp-kicker">Mission control · {mission.category}</p>
          <h1>{mission.title}</h1>
        </div>
      </header>
      {portal && <PortalTransition planet={planetName} onDone={() => setPortal(false)} />}

      <div className="mp-grid">
        <div className="mp-main">
          {/* Setup: always available, always clickable */}
          <section className="mp-card mp-setup" aria-labelledby="setup-title">
            <div className="mp-setup-row">
              <div>
                <h2 id="setup-title">Choose your mission level</h2>
                <p className="mp-muted">{DIFFICULTY_INFO[difficulty].detail}</p>
              </div>
            </div>
            <DifficultyPicker value={difficulty} onChange={(level) => requestChange({ difficulty: level })} counts={freshCounts} recommended={recommended?.level} />
            {recommended && <p className="mp-recommend">⭐ {recommended.reason}</p>}
            <div className="mp-stage-row" role="group" aria-label="Adventure stage">
              <span>STAGE</span>
              {mission.scenarios.map((s, index) => (
                <button key={s.id} type="button" className={`mp-stage ${scenarioId === s.id ? "active" : ""}`} aria-pressed={scenarioId === s.id}
                  onClick={() => requestChange({ scenarioId: s.id })}>
                  <b>0{index + 1}</b> {s.name}
                </button>
              ))}
            </div>
            {pendingChange && (
              <div className="mp-confirm" role="alertdialog" aria-label="Restart mission?">
                <p>Restart this mission at <b>{pendingChange.difficulty}</b>{pendingChange.scenarioId !== scenarioId ? <> on <b>{mission.scenarios.find((s) => s.id === pendingChange.scenarioId)?.name}</b></> : null}? Your current answers will be cleared.</p>
                <div>
                  <button type="button" className="mp-btn primary" onClick={() => startMission(pendingChange)} disabled={busy}><RotateCcw size={15} /> Restart now</button>
                  <button type="button" className="mp-btn ghost" onClick={() => setPendingChange(null)}>Keep playing</button>
                </div>
              </div>
            )}
            {notice && <p className="mp-notice" role="status">{notice}</p>}
            {session?.notice && <p className="mp-session-notice" role="status">ℹ️ {session.notice}</p>}
            {exhausted && (
              <div className="mp-exhausted" role="alert">
                <NovaAstronaut size={72} mood="think" />
                <div>
                  <h3>You've explored every new question here!</h3>
                  <p>{exhausted.message}</p>
                  <div className="mp-exhausted-actions">
                    {LEVELS.filter((l) => l !== difficulty && (freshCounts?.[l] ?? 1) > 0).map((l) => (
                      <button key={l} type="button" className={`mp-btn ghost level-btn level-${l.toLowerCase()}`} onClick={() => startMission({ difficulty: l })}>Try {l}{freshCounts ? ` (${freshCounts[l]} new)` : ""}</button>
                    ))}
                    {mission.scenarios.filter((sc) => sc.id !== scenarioId).map((sc) => (
                      <button key={sc.id} type="button" className="mp-btn ghost" onClick={() => startMission({ scenarioId: sc.id })}>Try “{sc.name}”</button>
                    ))}
                    <button type="button" className="mp-btn primary" onClick={() => startMission({ review: true })}><RotateCcw size={15} /> Review mission</button>
                  </div>
                </div>
              </div>
            )}
            {!session && (
              <button type="button" className="mp-btn primary wide launch" onClick={() => startMission()} disabled={busy}>
                {busy ? "Preparing mission…" : <>Start {difficulty} mission <ArrowRight size={18} /></>}
              </button>
            )}
          </section>

          {session && (
            <section className="mp-card mp-briefing" aria-labelledby="brief-title">
              <div className="mp-brief-head"><TriangleAlert size={18} /><h2 id="brief-title">Emergency briefing: {currentScenario?.name}</h2></div>
              <p>{session.problem}</p>
              <ul className="mp-clues">
                {(currentScenario?.clues || []).map((clue, index) => (
                  <li key={clue} className={index < session.clues.length || isFinished ? "open" : ""}>
                    <span>CLUE {index + 1}</span>{index < session.clues.length || isFinished ? clue : "Unlocks as you answer…"}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {session && (
            <section className="mp-card mp-quiz" aria-live="polite">
              <div className="mp-progress" aria-label={`Question ${Math.min(history.length + (feedback ? 0 : 1), total)} of ${total}`}>
                {Array.from({ length: total }, (_, i) => {
                  const h = history[i];
                  const state = h ? (h.correct ? "right" : "wrong") : i === history.length && !isFinished ? "current" : "";
                  return <span key={i} className={`mp-dot ${state}`}>{h ? (h.correct ? "✓" : "✕") : i + 1}</span>;
                })}
                <div className="mp-progress-bar"><i style={{ width: `${(history.length / total) * 100}%` }} /></div>
              </div>

              {question && (
                <div className="mp-question q-enter" key={question.id}>
                  <div className="mp-q-badges">
                    <span className="mp-q-count">Question {question.number} of {question.total}</span>
                    <span className="mp-badge kind">{question.kind === "decision" ? "🛠️ Engineering decision" : "🔭 Space science"}</span>
                    <span className="mp-badge topic">{question.topic}</span>
                    {question.origin === "verified-data" && <span className="mp-badge data" title="Calculated from NASA planetary data">📊 NASA data</span>}
                    {question.origin === "ai-generated" && <span className="mp-badge ai" title="Created by AI and checked against PARADOX's referenced knowledge base">🤖 AI-generated · checked</span>}
                    {question.label && <span className="mp-badge label">{question.label}</span>}
                    {question.branch === "follow-up" && <span className="mp-badge branch">↪ Follow-up</span>}
                    {question.branch === "challenge" && <span className="mp-badge challenge">⚡ Challenge</span>}
                  </div>
                  <h2 className="mp-q-text">{question.text}</h2>
                  <div className={`mp-options n${options.length}`} role="radiogroup" aria-label="Answer options">
                    {options.map((option, index) => (
                      <button key={option.id} type="button" role="radio" aria-checked={selected === option.id}
                        className={`mp-option ${selected === option.id ? "picked" : ""}`} onClick={() => setSelected(option.id)} disabled={busy}>
                        <span className="mp-letter">{option.id}</span>
                        <span className="mp-label">{option.label}</span>
                        <kbd aria-hidden="true">{index + 1}</kbd>
                      </button>
                    ))}
                  </div>
                  <div className="mp-q-actions">
                    <button type="button" className="mp-btn ghost" onClick={() => openAskAI(aiContext, "Can you give me a hint for this question?")}><Lightbulb size={15} /> Hint from AI</button>
                    <button type="button" className="mp-btn primary" onClick={submitAnswer} disabled={!selected || busy}>{busy ? "Checking…" : <>Check answer <ChevronRight size={17} /></>}</button>
                  </div>
                </div>
              )}

              {feedback && (
                <div className={`mp-feedback ${feedback.correct ? "good" : "bad"} q-enter`} key={`fb-${feedback.step}`}>
                  <div className="mp-fb-head">
                    {feedback.correct ? <CircleCheckBig size={26} /> : <CircleX size={26} />}
                    <div>
                      <b>{feedback.correct ? ["Brilliant!", "Spot on, Commander!", "Stellar answer!", "You got it!"][feedback.step % 4] : "Good try! Let's learn from this one."}</b>
                      <small>{feedback.question}</small>
                    </div>
                  </div>
                  {!feedback.correct && <p className="mp-fb-yours">Your answer: <s>{feedback.action}</s></p>}
                  <p className="mp-fb-answer"><Target size={15} /> Correct answer: <b>{feedback.correct_answer}</b></p>
                  <p className="mp-fb-expl">{feedback.explanation}</p>
                  {feedback.story && <p className={`mp-fb-story ${feedback.correct ? "good" : "bad"}`}>{feedback.correct ? "🛰️" : "📡"} {feedback.story}</p>}
                  {feedback.event && <p className="mp-fb-event">⚠️ {feedback.event}</p>}
                  <div className="mp-q-actions">
                    {!feedback.correct && <button type="button" className="mp-btn ghost" onClick={() => openAskAI(aiContext, "Why was my answer wrong?", "why")}><Lightbulb size={15} /> Why was I wrong?</button>}
                    <button type="button" className="mp-btn ghost" onClick={() => openAskAI(aiContext, "Can you tell me more about this?", "more")}><BookOpen size={15} /> Learn more</button>
                    <button type="button" className="mp-btn ghost" onClick={() => openAskAI(aiContext)}><Bot size={15} /> Ask AI</button>
                    {feedback.source && <a className="mp-btn ghost" href={feedback.source} target="_blank" rel="noopener noreferrer">NASA facts ↗</a>}
                    <button type="button" className="mp-btn primary" onClick={nextQuestion} autoFocus>
                      {isFinished ? <>See mission results <Sparkles size={16} /></> : <>Next question <ArrowRight size={16} /></>}
                    </button>
                  </div>
                </div>
              )}

              {showResults && (
                <div className="mp-results q-enter">
                  <div className={`mp-results-head ${session.status === "SUCCESS" ? "good" : "bad"}`}>
                    <NovaAstronaut size={86} mood={session.status === "SUCCESS" ? "cheer" : "wave"} className="mp-results-nova" />
                    <div className="mp-stars" aria-label={`${stars} of 3 stars`}>{[0, 1, 2].map((i) => <span key={i} className={i < stars ? "lit" : ""} style={{ "--i": i }}>★</span>)}</div>
                    <h2>{session.status === "SUCCESS" ? "Mission complete!" : "Mission not completed yet"}</h2>
                    <p>You answered <b>{correctCount} of {total}</b> correctly on <b>{difficulty}</b>. {session.status === "SUCCESS" ? "The crew is safe!" : `You need ${session.pass_mark} correct to pass. You've got this!`}</p>
                  </div>
                  <h3 className="mp-review-title">Review your answers</h3>
                  <ol className="mp-review">
                    {history.map((h) => (
                      <li key={h.step} className={h.correct ? "right" : "wrong"}>
                        <span className="mp-review-mark">{h.correct ? "✓" : "✕"}</span>
                        <div>
                          <b>{h.question}</b>
                          <p>{h.correct ? <>You answered <em>{h.correct_answer}</em></> : <>You chose <s>{h.action}</s>. Correct: <em>{h.correct_answer}</em></>}</p>
                          <small>{h.explanation}</small>
                        </div>
                        <button type="button" className="mp-mini" onClick={() => openAskAI({ ...aiContext, question: h.question, question_id: h.question_id, topic: h.topic, answered: true, correct_answer: h.correct_answer, explanation: h.explanation })} aria-label={`Ask AI about: ${h.question}`}><Bot size={14} /></button>
                      </li>
                    ))}
                  </ol>
                  <div className="mp-q-actions">
                    {missed.length > 0 && <button type="button" className="mp-btn ghost" onClick={() => setPractice({ items: missed, index: 0, picked: "", done: 0 })}><RotateCcw size={15} /> Practise missed questions</button>}
                    <button type="button" className="mp-btn ghost" onClick={() => startMission()} disabled={busy}><RotateCcw size={15} /> Retry mission</button>
                    <button type="button" className="mp-btn primary" onClick={() => navigate(session.status === "SUCCESS" ? nextDestination : `/missions?planet=${id}`)}>
                      {session.status === "SUCCESS" ? "Next adventure" : "Back to orbit"} <ArrowRight size={16} />
                    </button>
                  </div>
                  {practice && <PracticeRound practice={practice} setPractice={setPractice} />}
                </div>
              )}
            </section>
          )}

          {error && <p className="mp-error" role="alert">{error}</p>}
        </div>

        <aside className="mp-side">
          <section className="mp-card mp-ai-card">
            <div className="mp-ai-head"><span>🤖</span><div><h2>AI Co-Pilot</h2><p>Curious? Ask Zippy anything about {planetName} or this question.</p></div></div>
            <button type="button" className="mp-btn primary wide" onClick={() => openAskAI(aiContext)}><Sparkles size={16} /> Ask AI</button>
          </section>
          {session && (
            <section className="mp-card mp-telemetry">
              <div className="mp-tele-head"><Activity size={17} /><h2>Spacecraft telemetry</h2></div>
              <p className="mp-score">Score <b>{correctCount}</b> / {total} · pass mark {session.pass_mark}</p>
              {Object.entries(session.resources).map(([name, value]) => (
                <div key={name} className="mp-meter">
                  <div><span>{RESOURCE_LABELS[name] || name}</span><b>{value}</b></div>
                  <i><em className={value <= 25 ? "low" : value <= 50 ? "mid" : ""} style={{ width: `${value}%` }} /></i>
                </div>
              ))}
              <small className="mp-muted">Simulated gameplay values, not real telemetry.</small>
            </section>
          )}
        </aside>
      </div>

      <MissionOutcomeOverlay
        open={Boolean(isFinished && !feedback && !outcomeClosed)}
        success={session?.status === "SUCCESS"}
        title={session?.status === "SUCCESS" ? "Mission complete!" : "Mission not complete yet"}
        description={session?.status === "SUCCESS"
          ? `Amazing work, Commander! ${correctCount}/${total} correct on ${difficulty}. Your next adventure is ready.`
          : `You scored ${correctCount}/${total}. Review the explanations, then try this adventure again. Every great explorer learns from mistakes!`}
        saving={savingProgress}
        onPrimary={() => navigate(session?.status === "SUCCESS" ? nextDestination : `/missions?planet=${id}`)}
        primaryLabel={session?.status === "SUCCESS" ? "Travel to next adventure" : "Return to orbit"}
        onSecondary={() => setOutcomeClosed(true)}
        secondaryLabel="Review my answers"
      />
    </main>
  );
}

function PracticeRound({ practice, setPractice }) {
  const item = practice.items[practice.index];
  if (!item) {
    return <div className="mp-practice done"><b>Practice complete!</b> You got {practice.done} of {practice.items.length} right this time. 🎉</div>;
  }
  const options = item.options?.length ? item.options : [item.correct_answer, item.action];
  const answered = Boolean(practice.picked);
  const right = practice.picked === item.correct_answer;
  return (
    <div className="mp-practice q-enter" key={item.question_id}>
      <p className="mp-q-meta">PRACTICE {practice.index + 1} OF {practice.items.length}</p>
      <h3>{item.question}</h3>
      <div className="mp-options">
        {options.map((label, i) => (
          <button key={label} type="button" disabled={answered}
            className={`mp-option ${answered && label === item.correct_answer ? "is-right" : ""} ${answered && label === practice.picked && !right ? "is-wrong" : ""}`}
            onClick={() => { const ok = label === item.correct_answer; emitFx(ok ? "correct" : "wrong"); setPractice({ ...practice, picked: label, done: practice.done + (ok ? 1 : 0) }); }}>
            <span className="mp-letter">{"ABCD"[i]}</span><span className="mp-label">{label}</span>
          </button>
        ))}
      </div>
      {answered && <p className="mp-fb-expl">{right ? "Correct! " : `The answer is "${item.correct_answer}". `}{item.explanation}</p>}
      {answered && <button type="button" className="mp-btn primary" onClick={() => setPractice({ ...practice, index: practice.index + 1, picked: "" })}>Continue <ArrowRight size={15} /></button>}
    </div>
  );
}
