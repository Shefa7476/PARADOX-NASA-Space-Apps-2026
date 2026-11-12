
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authFetch } from "../services/api";
import {
  ArrowLeft,
  Activity,
  Satellite,
  RefreshCcw,
  Sun,
  Rocket,
  Zap,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import MissionOutcomeOverlay from "../components/MissionOutcomeOverlay";
import "../styles/solar-storm.css";

const API = "http://127.0.0.1:8000";

async function api(path, options = {}) {
  const response = await authFetch(`${API}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }

  return data;
}

export default function SolarStorm() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [game, setGame] = useState(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const data = await api("/api/nasa/solar-flares");

        if (!cancelled) {
          setEvents(data.events);
          setEventId(data.events[0]?.event_id || "");
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    loadEvents();

    return () => { cancelled = true; };
  }, []);

  async function startMission() {
    if (!eventId || loading) return;

    setLoading(true);
    setError("");
    setGame(null);
    setSelected("");

    try {
      const data = await api("/api/solar-storm/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          difficulty
        })
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
      const data = await api("/api/solar-storm/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: game.session_id,
          action_id: selected
        })
      });

      setGame(data);
      setSelected("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const finished = game && game.status !== "ACTIVE";

  return (
    <main className="solar-storm-page mx-auto max-w-7xl px-5 py-10 text-white md:px-6">
      <Link
        to="/missions"
        className="flex items-center gap-2 text-cyan-400"
      >
        <ArrowLeft size={18} />
        Back to Missions
      </Link>

      <header className="storm-hero mt-8">
        <div className="storm-sun-art" aria-hidden="true"><div className="storm-sun-core"><Sun size={62} /></div><i className="storm-corona corona-one" /><i className="storm-corona corona-two" /><i className="storm-flare flare-one" /><i className="storm-flare flare-two" /><span className="storm-orbit-line" /></div>
        <div className="storm-hero-copy"><span><Sparkles size={14} /> NASA SPACE WEATHER LAB</span><h1>Solar <em>Storm</em></h1><p>A powerful solar flare is racing through space. Protect the spacecraft, read the warning signals, and choose the safest response.</p><div className="storm-hero-tags"><b><ShieldCheck size={14} /> PROTECT THE CREW</b><b><Zap size={14} /> LIVE SPACE WEATHER</b></div></div>
      </header>

      {!game && (
        <section className="storm-config-panel mt-8">
          <h2 className="text-xl font-bold">Prepare for the solar event</h2>

          <label className="mt-6 block text-sm text-slate-400">
            Select NASA Solar Flare Event
          </label>

          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="mt-2 w-full rounded-lg bg-slate-800 p-3"
          >
            {events.map((event) => (
              <option
                key={event.event_id}
                value={event.event_id}
              >
                {event.class_type || "Unclassified"}
                {" — "}
                {event.begin_time}
              </option>
            ))}
          </select>

          <p className="mt-5 text-sm font-bold text-slate-300">Choose your storm-response level</p>
          <div className="storm-difficulty-grid">
            {[{name:"Easy",desc:"Learn to read solar alerts",icon:Sparkles},{name:"Medium",desc:"Balance safety and power",icon:ShieldCheck},{name:"Hard",desc:"Protect systems under pressure",icon:Zap}].map(({name,desc,icon:Icon}) => (
              <button key={name} type="button" onClick={() => setDifficulty(name)} className={`storm-difficulty-card ${difficulty === name ? "active" : ""}`}><Icon size={25} /><b>{name}</b><small>{desc}</small><span>{difficulty === name ? "SELECTED" : "CHOOSE LEVEL"}</span></button>
            ))}
          </div>

          <button onClick={startMission} disabled={!eventId || loading} className="storm-launch-button">
            {loading ? "Charging mission systems…" : "Launch solar investigation"} <Rocket size={18} />
          </button>

          {events.length === 0 && !error && (
            <p className="mt-4 text-slate-400">
              No recent NASA events available.
            </p>
          )}
        </section>
      )}

      {game && (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">

            <section className="rounded-2xl border border-cyan-500/20 bg-slate-900 p-6">
              <div className="flex items-center gap-2 text-cyan-400">
                <Satellite size={20} />
                <h2 className="text-xl font-bold">
                  NASA DONKI Event
                </h2>
              </div>

              <div className="mt-5 space-y-2 text-sm">
                <p>Event ID: {game.nasa_event.event_id}</p>
                <p>Flare Class: {game.nasa_event.class_type}</p>
                <p>Begin: {game.nasa_event.begin_time}</p>
                <p>Peak: {game.nasa_event.peak_time}</p>
                <p>End: {game.nasa_event.end_time || "Unknown"}</p>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                Source: NASA DONKI. Spacecraft telemetry is simulated.
              </p>
            </section>

            <section className="rounded-2xl bg-slate-900 p-6">
              <p className="text-sm text-cyan-400">
                Stage {Math.min(game.stage_index + 1, game.total_stages)}
                /{game.total_stages}
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {game.stage_name || `Mission ${game.status}`}
              </h2>

              <p className="mt-4 text-slate-300">
                {game.briefing || "Investigation completed."}
              </p>
            </section>

            {!finished && (
              <>
                <section className="rounded-2xl bg-slate-900 p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
                    <Activity className="text-cyan-400" />
                    Simulated Spacecraft Telemetry
                  </h2>

                  {Object.entries(game.telemetry).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between gap-4 border-b border-white/10 py-3 text-sm"
                      >
                        <span className="capitalize">
                          {key.replaceAll("_", " ")}
                        </span>
                        <span className="text-cyan-300">
                          {value}
                        </span>
                      </div>
                    )
                  )}
                </section>

                <section className="rounded-2xl bg-slate-900 p-6">
                  <h2 className="mb-5 text-xl font-bold">
                    Engineering Decisions
                  </h2>

                  <div className="space-y-3">
                    {game.actions.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => setSelected(action.id)}
                        disabled={loading}
                        className={`w-full rounded-xl border p-4 text-left ${
                          selected === action.id
                            ? "border-cyan-400 bg-cyan-500/10"
                            : "border-white/10 bg-slate-800"
                        }`}
                      >
                        <span className="mr-3 font-bold text-cyan-400">
                          {action.id}.
                        </span>
                        {action.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={executeAction}
                    disabled={!selected || loading}
                    className="mt-6 w-full rounded-xl bg-cyan-500 p-4 font-bold text-slate-950 disabled:opacity-40"
                  >
                    {loading ? "Evaluating..." : "Execute Decision"}
                  </button>
                </section>
              </>
            )}

            <section className="rounded-2xl bg-slate-900 p-6">
              <h2 className="mb-4 text-xl font-bold">
                Decision History
              </h2>

              {game.history.length === 0 && (
                <p className="text-slate-400">
                  No decisions submitted.
                </p>
              )}

              {game.history.map((entry, index) => (
                <div
                  key={index}
                  className="mb-3 rounded-xl bg-slate-800 p-4"
                >
                  <p className="font-semibold">
                    {entry.stage}: {entry.action}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    {entry.feedback}
                  </p>
                </div>
              ))}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl bg-slate-900 p-6">
              <h2 className="mb-5 text-xl font-bold">
                Mission Resources
              </h2>

              {Object.entries(game.resources).map(
                ([key, value]) => (
                  <div key={key} className="mb-5">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="capitalize">{key}</span>
                      <span>{value}/100</span>
                    </div>

                    <div className="h-2 rounded-full bg-slate-700">
                      <div
                        className={`h-2 rounded-full ${
                          value <= 25
                            ? "bg-red-400"
                            : value <= 50
                            ? "bg-amber-400"
                            : "bg-cyan-400"
                        }`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                )
              )}
            </section>

            {finished && (
              <section className="rounded-2xl bg-slate-900 p-6">
                <h2 className={`text-2xl font-bold ${
                  game.status === "SUCCESS"
                    ? "text-green-400"
                    : "text-red-400"
                }`}>
                  Mission {game.status}
                </h2>

                <p className="mt-3 text-sm text-slate-400">
                  {game.scientific_note}
                </p>

                <button
                  onClick={startMission}
                  disabled={loading}
                  className="mt-5 flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-3 font-bold text-slate-950"
                >
                  <RefreshCcw size={16} />
                  Retry Mission
                </button>

                <button
                  onClick={() => {
                    setGame(null);
                    setSelected("");
                    setError("");
                  }}
                  className="mt-4 block text-sm text-cyan-400"
                >
                  Choose another event
                </button>
              </section>
            )}
          </aside>
        </div>
      )}

      {error && (
        <p className="mt-6 text-red-400">
          {error}
        </p>
      )}
      <MissionOutcomeOverlay
        open={Boolean(finished)}
        success={game?.status === "SUCCESS"}
        title={game?.status === "SUCCESS" ? "SOLAR STORM CONTAINED!" : "SPACECRAFT IN DANGER"}
        description={game?.status === "SUCCESS" ? "Fantastic work! You protected the spacecraft from the solar event and kept the mission safe." : "The storm-response plan failed. Emergency shelter mode is active. Return to mission control and try another strategy."}
        onPrimary={() => { setGame(null); setSelected(""); setError(""); }}
        primaryLabel="Run the storm simulation again"
        onSecondary={() => navigate("/missions")}
        secondaryLabel="Return to the planets"
      />
    </main>
  );
}
