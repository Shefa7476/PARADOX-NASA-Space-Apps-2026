import { useState } from "react";
import {
  Activity,
  TriangleAlert,
  ArrowRight,
  BrainCircuit,
  CircleCheckBig,
  ChevronRight,
  Cpu,
  Orbit,
  Rocket,
  Satellite,
  Sparkles,
  Telescope,
  Zap,
} from "lucide-react";
import {
  generateMissionQuestion,
  submitMissionAnswer,
} from "../services/aiMissionApi";
import "../styles/ai-lab.css";

const MISSIONS = [
  { id: 1, name: "The Lost Signal", icon: "📡", color: "#67e8f9" },
  { id: 2, name: "Oxygen Zero", icon: "🫧", color: "#a7f3d0" },
  { id: 3, name: "Solar Storm", icon: "☀️", color: "#fbbf24" },
  { id: 4, name: "The Broken Rover", icon: "🤖", color: "#fb923c" },
  { id: 5, name: "Collision Course", icon: "☄️", color: "#c4b5fd" },
  { id: 6, name: "Fire in Zero-G", icon: "🔥", color: "#fb7185" },
  { id: 7, name: "Dark Orbit", icon: "🔋", color: "#93c5fd" },
  { id: 8, name: "Seven Minutes to Mars", icon: "🪐", color: "#f9a8d4" },
];

const DIFFICULTIES = [
  { name: "Easy", subtitle: "Cadet", icon: "🌟", color: "mint" },
  { name: "Medium", subtitle: "Explorer", icon: "🚀", color: "cyan" },
  { name: "Hard", subtitle: "Commander", icon: "⚡", color: "violet" },
];

export default function AIMissionLab() {
  const [missionId, setMissionId] = useState("1");
  const [difficulty, setDifficulty] = useState("Easy");
  const [question, setQuestion] = useState(null);
  const [selectedAction, setSelectedAction] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeMission = MISSIONS.find((mission) => String(mission.id) === missionId) || MISSIONS[0];

  async function handleGenerate() {
    setLoading(true);
    setError("");
    setQuestion(null);
    setResult(null);
    setSelectedAction("");

    try {
      const data = await generateMissionQuestion({ missionId, difficulty });
      setQuestion(data);
    } catch (err) {
      setError(err.message || "Could not generate a mission question.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!question || !selectedAction || result || loading) return;
    setLoading(true);
    setError("");

    try {
      const data = await submitMissionAnswer({
        questionId: question.question_id,
        actionId: selectedAction,
      });
      setResult(data);
    } catch (err) {
      setError(err.message || "Could not submit your answer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ai-lab-page">
      <div className="ai-lab-stars" aria-hidden="true" />
      <div className="ai-lab-nebula ai-lab-nebula-one" aria-hidden="true" />
      <div className="ai-lab-nebula ai-lab-nebula-two" aria-hidden="true" />

      <div className="ai-lab-container">
        <header className="ai-lab-hero">
          <div className="ai-lab-hero-copy">
            <span className="ai-lab-kicker"><Sparkles size={14} /> PARADOX · INTELLIGENCE DIVISION</span>
            <h1>AI Mission <span>Lab</span></h1>
            <p>
              Every clue tells a story. Scan a mission, let the AI build a fresh
              space emergency, then think like a real flight engineer.
            </p>
            <div className="ai-lab-hero-tags">
              <span><BrainCircuit size={14} /> AI-generated scenarios</span>
              <span><Satellite size={14} /> Mission telemetry</span>
              <span><Zap size={14} /> Your decisions matter</span>
            </div>
          </div>

          <div className="ai-lab-hero-art" aria-hidden="true">
            <div className="ai-lab-orbit ai-lab-orbit-a" />
            <div className="ai-lab-orbit ai-lab-orbit-b" />
            <div className="ai-lab-orbit ai-lab-orbit-c" />
            <div className="ai-lab-core"><BrainCircuit size={54} strokeWidth={1.4} /></div>
            <span className="ai-lab-satellite ai-lab-satellite-one"><Satellite size={22} /></span>
            <span className="ai-lab-satellite ai-lab-satellite-two"><Orbit size={18} /></span>
            <span className="ai-lab-spark ai-lab-spark-one">✦</span>
            <span className="ai-lab-spark ai-lab-spark-two">✧</span>
            <span className="ai-lab-scanline" />
          </div>
        </header>

        <section className="ai-lab-stats" aria-label="AI lab capabilities">
          <div className="ai-lab-stat"><span className="ai-stat-icon"><Cpu size={18} /></span><b>01</b><small>Scenario generator</small></div>
          <div className="ai-lab-stat"><span className="ai-stat-icon"><Telescope size={18} /></span><b>02</b><small>Clue investigation</small></div>
          <div className="ai-lab-stat"><span className="ai-stat-icon"><Activity size={18} /></span><b>03</b><small>Decision analysis</small></div>
        </section>

        <div className="ai-lab-workspace">
          <section className="ai-config-panel">
            <div className="ai-panel-heading">
              <span className="ai-panel-icon"><Rocket size={20} /></span>
              <div><span>FLIGHT CONTROL</span><h2>Configure your mission</h2></div>
            </div>

            <label className="ai-field-label" htmlFor="ai-mission-select">Choose a mission world</label>
            <div className="ai-select-wrap">
              <span className="ai-select-emoji">{activeMission.icon}</span>
              <select
                id="ai-mission-select"
                value={missionId}
                onChange={(event) => setMissionId(event.target.value)}
                disabled={loading}
              >
                {MISSIONS.map((mission) => (
                  <option key={mission.id} value={mission.id}>
                    {mission.id}. {mission.name}
                  </option>
                ))}
              </select>
              <ChevronRight size={17} />
            </div>

            <div className="ai-field-label ai-difficulty-label">Select challenge level</div>
            <div className="ai-difficulty-grid">
              {DIFFICULTIES.map((level) => (
                <button
                  key={level.name}
                  type="button"
                  className={`ai-difficulty-card ai-difficulty-${level.color} ${difficulty === level.name ? "is-active" : ""}`}
                  onClick={() => setDifficulty(level.name)}
                  disabled={loading}
                  aria-pressed={difficulty === level.name}
                >
                  <span>{level.icon}</span>
                  <b>{level.name}</b>
                  <small>{level.subtitle}</small>
                </button>
              ))}
            </div>

            <button type="button" onClick={handleGenerate} disabled={loading} className="ai-generate-button">
              {loading && !question ? <span className="ai-button-spinner" /> : <BrainCircuit size={19} />}
              {loading && !question ? "Scanning the galaxy…" : "Generate AI Mission"}
              {!loading && <ArrowRight size={18} />}
            </button>
            <p className="ai-config-note"><Activity size={13} /> Your mission parameters are sent to the PARADOX AI engine.</p>

            {error && <div role="alert" className="ai-error"><TriangleAlert size={17} />{error}</div>}
          </section>

          <section className={`ai-investigation-panel ${question ? "has-question" : ""}`}>
            {!question && !loading && (
              <div className="ai-empty-state">
                <div className="ai-empty-orbit"><span /><span /><span /><div><BrainCircuit size={36} /></div></div>
                <span className="ai-panel-eyebrow">AWAITING YOUR COMMAND</span>
                <h2>Ready to investigate?</h2>
                <p>Choose a world and challenge level. Your AI mission computer will generate a unique emergency briefing.</p>
                <div className="ai-empty-steps">
                  <span><i>1</i> Scan</span><ChevronRight size={14} /><span><i>2</i> Investigate</span><ChevronRight size={14} /><span><i>3</i> Decide</span>
                </div>
              </div>
            )}

            {loading && !question && (
              <div className="ai-loading-state">
                <div className="ai-radar"><span /><span /><span /><i /></div>
                <span className="ai-panel-eyebrow">AI CORE ONLINE</span>
                <h2>Scanning mission systems…</h2>
                <p>Collecting telemetry · Building a scenario · Preparing your challenge</p>
                <div className="ai-loading-bars"><i /><i /><i /><i /><i /></div>
              </div>
            )}

            {question && (
              <div className="ai-question-content">
                <div className="ai-question-topline">
                  <span className="ai-panel-eyebrow"><span className="ai-live-dot" /> LIVE INVESTIGATION</span>
                  <span className="ai-generation-badge">{question.generation_mode || "AI SIMULATION"}</span>
                </div>
                <div className="ai-question-heading">
                  <div className="ai-question-emblem">{activeMission.icon}</div>
                  <div><span>{activeMission.name} · {question.difficulty || difficulty}</span><h2>{question.problem}</h2></div>
                </div>
                <div className="ai-question-prompt"><span>MISSION ALERT</span><p>{question.question}</p></div>

                <div className="ai-clue-heading"><Telescope size={17} /><h3>Clue scanner</h3><span>{question.clues?.length || 0} signals detected</span></div>
                <div className="ai-clue-grid">
                  {question.clues?.map((clue, index) => (
                    <div className="ai-clue-card" key={`${index}-${clue}`}>
                      <span>0{index + 1}</span><p>{clue}</p><i />
                    </div>
                  ))}
                </div>

                <fieldset className="ai-action-fieldset" disabled={Boolean(result) || loading}>
                  <legend><span>YOUR ENGINEERING DECISION</span><small>Select the response you believe will save the mission.</small></legend>
                  <div className="ai-action-grid">
                    {question.actions?.map((action) => (
                      <label key={action.id} className={`ai-action-card ${selectedAction === action.id ? "is-selected" : ""}`}>
                        <input type="radio" name="mission-action" value={action.id} checked={selectedAction === action.id} onChange={() => setSelectedAction(action.id)} />
                        <span className="ai-action-letter">{action.id}</span>
                        <span className="ai-action-copy">{action.label}</span>
                        <ChevronRight size={17} />
                      </label>
                    ))}
                  </div>
                </fieldset>

                <button type="button" onClick={handleSubmit} disabled={!selectedAction || loading || Boolean(result)} className="ai-submit-button">
                  {loading ? "Evaluating your decision…" : "Transmit Decision"}
                  <Rocket size={18} />
                </button>

                {result && (
                  <div className={`ai-result-panel ${result.correct ? "result-correct" : "result-incorrect"}`}>
                    <div className="ai-result-icon">{result.correct ? <CircleCheckBig size={28} /> : <TriangleAlert size={28} />}</div>
                    <div className="ai-result-copy">
                      <span>MISSION ANALYSIS COMPLETE</span>
                      <h3>{result.correct ? "Excellent decision, Commander!" : "Not quite — let's learn from the signal."}</h3>
                      <p>{result.rationale}</p>
                      <p className="ai-science-note"><b>Science note:</b> {result.educational_note}</p>
                      <button type="button" onClick={handleGenerate} disabled={loading}>Generate another challenge <ArrowRight size={15} /></button>
                    </div>
                  </div>
                )}
                <p className="ai-education-note">Educational simulation. NASA event metadata, when available, is separate from simulated spacecraft conditions and outcomes.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
