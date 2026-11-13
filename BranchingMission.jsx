import CopilotPanel from "../components/CopilotPanel";
import MissionOutcomeOverlay from "../components/MissionOutcomeOverlay";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authFetch } from "../services/api";
import {
  Activity,
  TriangleAlert,
  ArrowLeft,
  ArrowRight,
  CircleCheckBig,
  ChevronRight,
  Clock3,
  Flame,
  GitBranch,
  Orbit,
  RadioTower,
  RotateCcw,
  Rocket,
  Satellite,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import "../styles/branching-mission.css";

const API = (import.meta.env.VITE_API_BASE_URL === "same-origin" ? "" : (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"));

async function request(path, options = {}) {
  const response = await authFetch(`${API}${path}`, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "Request failed");
  }
  return data;
}

const resourceLabels = {
  power: "Power",
  fuel: "Fuel",
  oxygen: "Oxygen",
  integrity: "System Integrity",
  time: "Time Remaining",
};

const resourceIcons = {
  power: Zap,
  fuel: Flame,
  oxygen: Activity,
  integrity: ShieldCheck,
  time: Clock3,
};

export default function BranchingMission() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [game, setGame] = useState(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadEvents() {
      try {
        const data = await request("/api/nasa/solar-flares");
        if (!cancelled) {
          setEvents(data.events || []);
          setEventId(data.events?.[0]?.event_id || "");
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    }
    loadEvents();
    return () => { cancelled = true; };
  }, []);

  async function startMission() {
    if (!eventId || loading) return;
    setLoading(true);
    setError("");
    setSelected("");
    try {
      const data = await request("/api/branching/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId, difficulty }),
      });
      setGame(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function executeAction() {
    if (!selected || !game || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await request("/api/branching/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: game.session_id, action_id: selected }),
      });
      setGame(data);
      setSelected("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const active = game?.status === "ACTIVE";
  const finished = Boolean(game && !active);
  const history = game?.history || [];
  const event = game?.nasa_event || events.find((item) => item.event_id === eventId);
  const decisionsDone = game?.decision_count || history.length;
  const decisionLimit = game?.max_decisions || 5;

  return (
    <main className="branching-page">
      <div className="branching-stars" aria-hidden="true" />
      <div className="branching-nebula branching-nebula-a" aria-hidden="true" />
      <div className="branching-nebula branching-nebula-b" aria-hidden="true" />

      <div className="branching-container">
        <Link to="/missions" className="branching-back"><ArrowLeft size={16} /> Back to Solar System</Link>

        <header className="branching-hero">
          <div className="branching-hero-copy">
            <span className="branching-kicker"><GitBranch size={14} /> PARADOX · MULTIVERSE OPERATIONS</span>
            <h1>Branching <span>Mission</span></h1>
            <p>
              One decision can create a new timeline. Read the solar signals,
              protect your spacecraft, and discover where your choices lead.
            </p>
            <div className="branching-hero-tags">
              <span><Satellite size={14} /> NASA solar event data</span>
              <span><Orbit size={14} /> Multiple story paths</span>
              <span><Target size={14} /> Decision-driven outcomes</span>
            </div>
          </div>
          <div className="branching-hero-art" aria-hidden="true">
            <div className="branching-sun-glow" />
            <div className="branching-orbit branching-orbit-one" />
            <div className="branching-orbit branching-orbit-two" />
            <div className="branching-orbit branching-orbit-three" />
            <div className="branching-planet branching-planet-one" />
            <div className="branching-planet branching-planet-two" />
            <div className="branching-satellite"><RadioTower size={24} /></div>
            <div className="branching-path-visual"><i /><i /><i /><i /><i /></div>
          </div>
        </header>

        {!game && (
          <>
            <div className="branching-intro-strip">
              <div><span className="branching-intro-icon"><Activity size={18} /></span><b>SCAN</b><small>Read the real solar event</small></div>
              <ChevronRight size={16} />
              <div><span className="branching-intro-icon"><GitBranch size={18} /></span><b>CHOOSE</b><small>Pick an engineering response</small></div>
              <ChevronRight size={16} />
              <div><span className="branching-intro-icon"><Rocket size={18} /></span><b>DISCOVER</b><small>Watch your timeline unfold</small></div>
            </div>

            <section className="branching-config-layout">
              <div className="branching-config-panel">
                <div className="branching-panel-heading">
                  <span><Rocket size={20} /></span>
                  <div><small>MISSION FLIGHT CONTROL</small><h2>Prepare your spacecraft</h2></div>
                </div>

                <label className="branching-label" htmlFor="solar-event-select">Choose a NASA solar event</label>
                <div className="branching-select-wrap">
                  <Satellite size={18} />
                  <select
                    id="solar-event-select"
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    disabled={eventsLoading || loading}
                  >
                    {events.map((item) => (
                      <option key={item.event_id} value={item.event_id}>
                        {item.class_type || "Unknown flare"} — {item.begin_time}
                      </option>
                    ))}
                  </select>
                </div>
                {event && (
                  <div className="branching-event-preview">
                    <span className="branching-live-dot" />
                    <div><b>{event.class_type || "Solar activity detected"}</b><small>Event begins · {event.begin_time || "Time unavailable"}</small></div>
                    <span className="branching-event-tag">DONKI</span>
                  </div>
                )}

                <div className="branching-label">Choose your challenge level</div>
                <div className="branching-difficulty-grid">
                  {[
                    { name: "Easy", icon: "🌟", title: "Cadet", detail: "More time to think" },
                    { name: "Medium", icon: "🚀", title: "Explorer", detail: "Balanced challenge" },
                    { name: "Hard", icon: "⚡", title: "Commander", detail: "Critical decisions" },
                  ].map((level) => (
                    <button
                      key={level.name}
                      type="button"
                      className={`branching-difficulty-card ${difficulty === level.name ? "is-active" : ""} difficulty-${level.name.toLowerCase()}`}
                      onClick={() => setDifficulty(level.name)}
                      disabled={loading}
                      aria-pressed={difficulty === level.name}
                    >
                      <span>{level.icon}</span><b>{level.name}</b><small>{level.title}</small><em>{level.detail}</em>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={startMission}
                  disabled={!eventId || loading || eventsLoading}
                  className="branching-launch-button"
                >
                  {loading ? <span className="branching-spinner" /> : <Rocket size={19} />}
                  {loading ? "Building your timeline…" : "Launch Branching Mission"}
                  {!loading && <ArrowRight size={18} />}
                </button>

                {eventsLoading && <p className="branching-help">Connecting to NASA DONKI and scanning recent solar activity…</p>}
                {!eventsLoading && events.length === 0 && !error && <p className="branching-help">No recent NASA events are available right now. Try again in a moment.</p>}
              </div>

              <div className="branching-preview-panel">
                <div className="branching-preview-top"><span>YOUR CHOICES SHAPE THE STORY</span><Sparkles size={17} /></div>
                <h2>Which timeline will you create?</h2>
                <p>There is more than one possible future. Keep your ship safe and follow the evidence.</p>
                <div className="branching-mini-map">
                  <div className="branching-mini-node root-node"><RadioTower size={19} /><b>Solar alert</b></div>
                  <div className="branching-mini-forks"><i /><i /><i /></div>
                  <div className="branching-mini-branches">
                    <div className="mini-branch mini-branch-good"><ShieldCheck size={17} /><span>Safe orbit</span></div>
                    <div className="mini-branch mini-branch-risk"><Zap size={17} /><span>Power surge</span></div>
                    <div className="mini-branch mini-branch-mystery"><Orbit size={17} /><span>Unknown path</span></div>
                  </div>
                  <div className="branching-mini-footer"><span /> Timeline paths waiting to be discovered</div>
                </div>
                <div className="branching-preview-foot"><span>01</span> Analyze <span>02</span> Decide <span>03</span> Adapt</div>
              </div>
            </section>
          </>
        )}

        {game && (
          <>
            <section className="branching-game-hud">
              <div className="branching-hud-main">
                <span className={`branching-status-pill ${active ? "status-active" : game.status === "SUCCESS" ? "status-success" : "status-failed"}`}>
                  <i /> {active ? "TIMELINE ACTIVE" : `TIMELINE ${game.status}`}
                </span>
                <h2>{active ? game.stage : `Mission ${game.status}`}</h2>
                <p>{game.briefing || "The branching investigation has ended."}</p>
              </div>
              <div className="branching-hud-metric"><span>DECISION</span><b>{Math.min(decisionsDone + (active ? 1 : 0), decisionLimit)}<small> / {decisionLimit}</small></b><div><i style={{ width: `${Math.min(100, (decisionsDone / Math.max(1, decisionLimit)) * 100)}%` }} /></div></div>
              <div className="branching-hud-metric"><span>CURRENT NODE</span><b className="node-value">{game.node_id}</b><small>Story branch</small></div>
            </section>

            <section className="branching-route-panel">
              <div className="branching-route-heading"><div><span className="branching-panel-kicker">LIVE STORY MAP</span><h3>Your timeline path</h3></div><span className="branching-route-badge"><GitBranch size={14} /> BRANCH TRACKER</span></div>
              <div className="branching-route-track">
                <div className="branching-route-line" />
                <div className="branching-route-nodes">
                  <div className="branching-route-node route-origin"><span><RadioTower size={16} /></span><b>Alert</b></div>
                  {history.map((entry, index) => (
                    <div className="branching-route-node route-visited" key={`${entry.step}-${entry.to_node}`}>
                      <span><CircleCheckBig size={16} /></span><b>{entry.to_node}</b><small>Choice {entry.step}</small>
                    </div>
                  ))}
                  {active && <div className="branching-route-node route-current"><span><Orbit size={17} /></span><b>{game.node_id}</b><small>Current position</small></div>}
                  {finished && <div className={`branching-route-node ${game.status === "SUCCESS" ? "route-success" : "route-failed"}`}><span>{game.status === "SUCCESS" ? <ShieldCheck size={17} /> : <TriangleAlert size={17} />}</span><b>{game.status === "SUCCESS" ? "Safe timeline" : "Timeline ended"}</b></div>}
                </div>
              </div>
            </section>

            <div className="branching-game-grid">
              <div className="branching-game-main">
                <section className="branching-event-card">
                  <div className="branching-event-planet"><div className="branching-event-sun" /><span><Satellite size={22} /></span></div>
                  <div className="branching-event-copy">
                    <span className="branching-panel-kicker">NASA DONKI · SOLAR EVENT</span>
                    <h3>{game.nasa_event?.class_type || "Solar activity detected"}</h3>
                    <p>Event ID: {game.nasa_event?.event_id || "Unavailable"}</p>
                    <div className="branching-event-times"><span>Begin <b>{game.nasa_event?.begin_time || "—"}</b></span><span>Peak <b>{game.nasa_event?.peak_time || "—"}</b></span></div>
                    <small>NASA event metadata is historical; spacecraft conditions are simulated for learning.</small>
                  </div>
                </section>

                <section className="branching-briefing-card">
                  <div className="branching-briefing-top"><span><Activity size={17} /> FLIGHT ENGINEERING BRIEFING</span><span>NODE {game.node_id}</span></div>
                  <h3>{active ? "A new decision point has appeared" : `Mission ${game.status}`}</h3>
                  <p>{game.briefing || "The branching investigation has ended."}</p>
                </section>

                {active && (
                  <section className="branching-decisions-panel">
                    <div className="branching-panel-title"><div><span className="branching-panel-kicker">CHOOSE YOUR NEXT MOVE</span><h3>Engineering decisions</h3></div><span className="branching-choice-count">{game.actions?.length || 0} OPTIONS</span></div>
                    <div className="branching-action-grid">
                      {game.actions.map((action, index) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => setSelected(action.id)}
                          disabled={loading}
                          className={`branching-action-card ${selected === action.id ? "is-selected" : ""}`}
                        >
                          <span className="branching-action-number">{String.fromCharCode(65 + index)}</span>
                          <span className="branching-action-copy"><b>{action.label}</b><small>Choose this path</small></span>
                          <ChevronRight size={18} />
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={executeAction} disabled={!selected || loading} className="branching-execute-button">
                      {loading ? "Calculating timeline…" : "Execute decision"} <ArrowRight size={17} />
                    </button>
                  </section>
                )}

                <section className="branching-history-panel">
                  <div className="branching-panel-title"><div><span className="branching-panel-kicker">YOUR STORY SO FAR</span><h3>Decision history</h3></div><span className="branching-choice-count">{history.length} LOGGED</span></div>
                  {history.length === 0 ? (
                    <div className="branching-history-empty"><GitBranch size={25} /><p>Your first choice will appear here and create a new timeline branch.</p></div>
                  ) : (
                    <div className="branching-history-list">
                      {history.map((entry) => (
                        <article className="branching-history-entry" key={entry.step}>
                          <span className="branching-history-step">{String(entry.step).padStart(2, "0")}</span>
                          <div className="branching-history-copy"><b>{entry.from_node} <ChevronRight size={13} /> {entry.to_node}</b><p>{entry.action}</p><small>{entry.feedback}</small><em>Engineering principle: {entry.principle}</em></div>
                          <div className="branching-resource-changes">{Object.entries(entry.resource_changes || {}).map(([name, change]) => <span key={name}>{name}: {change > 0 ? "+" : ""}{change}</span>)}</div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <aside className="branching-game-side">
                <CopilotPanel sessionId={game.session_id} nodeId={game.node_id} active={active} />

                <section className="branching-resource-panel">
                  <div className="branching-panel-title"><div><span className="branching-panel-kicker">SHIP STATUS</span><h3>Mission resources</h3></div><Activity size={18} /></div>
                  {Object.entries(game.resources || {}).map(([key, value]) => {
                    const Icon = resourceIcons[key] || Activity;
                    const amount = Math.max(0, Math.min(100, Number(value) || 0));
                    return (
                      <div className="branching-resource-row" key={key}>
                        <div className="branching-resource-top"><span><Icon size={14} /> {resourceLabels[key] || key}</span><b>{value}<small>/100</small></b></div>
                        <div className="branching-resource-track"><i className={amount <= 25 ? "resource-critical" : amount <= 50 ? "resource-warning" : ""} style={{ width: `${amount}%` }} /></div>
                      </div>
                    );
                  })}
                  <p>Game meters are learning-simulation values, not real spacecraft measurements.</p>
                </section>

                {finished && (
                  <section className="branching-finish-card">
                    <div className={game.status === "SUCCESS" ? "finish-icon finish-success" : "finish-icon finish-failed"}>
                      {game.status === "SUCCESS" ? <CircleCheckBig size={27} /> : <TriangleAlert size={27} />}
                    </div>
                    <span className="branching-panel-kicker">TIMELINE REPORT</span>
                    <h3>{game.status === "SUCCESS" ? "You saved this timeline!" : "This timeline has ended"}</h3>
                    <p>{game.scientific_note}</p>
                    <Link to={`/debrief/${game.session_id}`} className="branching-debrief-button">View mission debrief <ArrowRight size={15} /></Link>
                    <button type="button" onClick={startMission} disabled={loading} className="branching-retry-button"><RotateCcw size={15} /> Try another timeline</button>
                    <button type="button" onClick={() => { setGame(null); setSelected(""); setError(""); }} className="branching-reset-button">Choose another solar event</button>
                  </section>
                )}
              </aside>
            </div>
          </>
        )}

        {error && <div role="alert" className="branching-error"><TriangleAlert size={17} />{error}</div>}
      </div>

      <MissionOutcomeOverlay
        open={finished}
        success={game?.status === "SUCCESS"}
        title={game?.status === "SUCCESS" ? "TIMELINE SAVED!" : "TIMELINE COLLAPSED"}
        description={game?.status === "SUCCESS"
          ? "You followed the clues through the branching timeline and stabilized the mission."
          : "This timeline has reached a failure branch. Return to orbit, review the decision path, and try a new timeline."}
        onPrimary={() => { setGame(null); setSelected(""); setError(""); }}
        primaryLabel="Explore another timeline"
        onSecondary={() => navigate("/missions")}
        secondaryLabel="Return to the planets"
      />
    </main>
  );
}
