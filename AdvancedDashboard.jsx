import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authFetch } from "../services/api";
import { Atom, Rocket, ShieldCheck, Sparkles, Zap } from "lucide-react";
import MissionOutcomeOverlay from "../components/MissionOutcomeOverlay";
import "../styles/advanced-mission.css";

const API = (import.meta.env.VITE_API_BASE_URL === "same-origin" ? "" : (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"));

export default function AdvancedDashboard() {
  const navigate = useNavigate();
  const [difficulty, setDifficulty] = useState("Medium");
  const [game, setGame] = useState(null);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(path, body) {
    const response = await authFetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Request failed");
    }

    return data;
  }

  const finished = game && game.status !== "ACTIVE";

  async function start() {
    setBusy(true);
    setError("");
    setGame(null);
    setSelected("");

    try {
      const data = await request("/api/advanced/start", {
        mission_id: 2,
        scenario_id: 2,
        difficulty
      });
      setGame(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function execute() {
    if (!selected || !game || busy) return;

    setBusy(true);
    setError("");

    try {
      const data = await request("/api/advanced/action", {
        session_id: game.session_id,
        action_id: selected
      });
      setGame(data);
      setSelected("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="advanced-mission-page mx-auto max-w-6xl px-5 py-10 md:px-6">
      <Link to="/missions" className="text-cyan-300">← Back to Solar System</Link>

      <header className="advanced-hero mt-7">
        <div className="advanced-hero-art"><div className="advanced-planet-core"><Atom size={56} /></div><i /><b /><span /></div>
        <div className="advanced-hero-copy"><span><Sparkles size={14} /> PARADOX ENGINEERING ACADEMY</span><h1>Advanced <em>Mission Lab</em></h1><p>Become a space engineer. Read the telemetry, protect the crew, and solve a multi-stage spacecraft emergency.</p><div className="advanced-hero-tags"><b><ShieldCheck size={14} /> SYSTEMS THINKING</b><b><Zap size={14} /> MULTI-STAGE CHALLENGE</b></div></div>
      </header>

      <h2 className="advanced-mission-title">Oxygen Zero: Habitat Air Leakage</h2>
      <p className="mt-2 text-slate-400">Advanced Engineering Investigation · 3 stages</p>

      {!game && (
        <section className="advanced-config-panel mt-7">
          <div className="advanced-config-heading"><div><span>CHOOSE YOUR TRAINING LEVEL</span><h2>Set your challenge</h2></div><Rocket size={30} /></div>
          <div className="advanced-level-grid">
            {[{name:"Easy",desc:"Learn the basics",icon:Sparkles},{name:"Medium",desc:"Think like mission control",icon:Atom},{name:"Hard",desc:"Expert engineer mode",icon:Zap}].map(({name,desc,icon:Icon}) => (
              <button key={name} type="button" onClick={() => setDifficulty(name)} className={`advanced-level-card ${difficulty === name ? "active" : ""}`}><Icon size={27} /><b>{name}</b><small>{desc}</small><span>{difficulty === name ? "SELECTED" : "SELECT LEVEL"}</span></button>
            ))}
          </div>
          <button onClick={start} disabled={busy} className="advanced-launch-button">{busy ? "Initializing systems…" : "Start advanced investigation"} <Rocket size={18} /></button>
        </section>
      )}

      {game && (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-xl bg-slate-900 p-6">
              <p className="text-cyan-400">
                Stage {Math.min(game.stage_index + 1, game.total_stages)}
                /{game.total_stages}
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {game.stage_name || "Investigation Complete"}
              </h2>

              <p className="mt-4 text-slate-300">
                {game.briefing || `Mission ${game.status}`}
              </p>
            </section>

            {game.status === "ACTIVE" && (
              <>
                <section className="rounded-xl bg-slate-900 p-6">
                  <h2 className="mb-4 text-xl font-bold">
                    Mission Telemetry
                  </h2>

                  {Object.entries(game.telemetry).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between border-b border-white/10 py-3"
                      >
                        <span>{key.replaceAll("_", " ")}</span>
                        <span className="text-cyan-400">{value}</span>
                      </div>
                    )
                  )}
                </section>

                <section className="rounded-xl bg-slate-900 p-6">
                  <h2 className="mb-4 text-xl font-bold">
                    Engineering Decisions
                  </h2>

                  <div className="space-y-3">
                    {game.actions.map((action) => (
                      <button
                        key={action.id}
                        disabled={busy}
                        onClick={() => setSelected(action.id)}
                        className={`w-full rounded-lg border p-4 text-left ${
                          selected === action.id
                            ? "border-cyan-400 bg-cyan-500/10"
                            : "border-white/10 bg-slate-800"
                        }`}
                      >
                        {action.id}. {action.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={execute}
                    disabled={!selected || busy}
                    className="mt-5 w-full rounded-lg bg-cyan-500 p-4 font-bold text-slate-950 disabled:opacity-40"
                  >
                    {busy ? "Evaluating..." : "Execute Decision"}
                  </button>
                </section>
              </>
            )}

            <section className="rounded-xl bg-slate-900 p-6">
              <h2 className="mb-4 text-xl font-bold">
                Investigation History
              </h2>

              {game.history.map((entry) => (
                <div
                  key={entry.stage}
                  className="mb-3 rounded-lg bg-slate-800 p-4"
                >
                  <p className="font-semibold">
                    Stage {entry.stage}: {entry.action}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    {entry.feedback}
                  </p>
                </div>
              ))}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-xl bg-slate-900 p-6">
              <h2 className="mb-5 text-xl font-bold">
                Resources
              </h2>

              {Object.entries(game.resources).map(
                ([key, value]) => (
                  <div key={key} className="mb-4">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="capitalize">{key}</span>
                      <span>{value}/100</span>
                    </div>
                    <div className="h-2 rounded bg-slate-700">
                      <div
                        className="h-2 rounded bg-cyan-400"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                )
              )}
            </section>

            {game.status !== "ACTIVE" && (
              <section className="rounded-xl bg-slate-900 p-6">
                <h2 className={`text-2xl font-bold ${
                  game.status === "SUCCESS"
                    ? "text-green-400"
                    : "text-red-400"
                }`}>
                  Mission {game.status}
                </h2>

                <button
                  onClick={start}
                  disabled={busy}
                  className="mt-5 rounded-lg bg-cyan-500 px-5 py-3 font-bold text-slate-950"
                >
                  Retry Mission
                </button>
              </section>
            )}
          </aside>
        </div>
      )}

      {error && (
        <p className="mt-5 text-red-400">{error}</p>
      )}
      <MissionOutcomeOverlay
        open={Boolean(finished)}
        success={game?.status === "SUCCESS"}
        title={game?.status === "SUCCESS" ? "ENGINEERING BREAKTHROUGH!" : "SYSTEMS FAILURE"}
        description={game?.status === "SUCCESS" ? "Excellent engineering, Commander! You guided the habitat through every emergency stage." : "The habitat systems could not be stabilized this time. Return to the training bay, review the telemetry, and try again."}
        onPrimary={() => { setGame(null); setSelected(""); setError(""); }}
        primaryLabel="Try another challenge"
        onSecondary={() => navigate("/missions")}
        secondaryLabel="Return to the planets"
      />
    </main>
  );
}