import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  CircleCheckBig,
  ChevronRight,
  Orbit,
  Rocket,
  Sparkles,
  Lock,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../context/AuthContext";
import { authFetch } from "../services/api";
import LevelMap from "../components/LevelMap";
import DifficultyPicker, { DIFFICULTY_INFO, LEVELS } from "../components/DifficultyPicker";
import "../styles/solar-system.css";

// Each planet is linked to one of the eight existing backend missions.
// Its three scenarios appear as separate adventures in the planet pop-up.
const PLANETS = [
  { id: 1, name: "Mercury", missionId: 1, subtitle: "Signal Relay World", fact: "A small, rocky world closest to the Sun", color: "#c59a78", size: 68, orbitW: "23%", orbitH: "18%", duration: "19s", delay: "0s" },
  { id: 2, name: "Venus", missionId: 2, subtitle: "Life Support World", fact: "A hot world wrapped in thick clouds", color: "#e5b36f", size: 78, orbitW: "32%", orbitH: "26%", duration: "25s", delay: "-3.125s" },
  { id: 3, name: "Earth", missionId: 3, subtitle: "Our Home World", fact: "Our blue home planet, full of life", color: "#39a9e8", size: 90, orbitW: "41%", orbitH: "34%", duration: "31s", delay: "-7.75s" },
  { id: 4, name: "Mars", missionId: 4, subtitle: "Rover Discovery World", fact: "The red planet, home of robotic explorers", color: "#df7758", size: 82, orbitW: "50%", orbitH: "42%", duration: "37s", delay: "-13.875s" },
  { id: 5, name: "Jupiter", missionId: 5, subtitle: "Giant Planet World", fact: "The largest planet in our Solar System", color: "#d4a17a", size: 126, orbitW: "59%", orbitH: "50%", duration: "44s", delay: "-22s" },
  { id: 6, name: "Saturn", missionId: 6, subtitle: "Ring Explorer World", fact: "A gas giant famous for its beautiful rings", color: "#ddc18c", size: 118, orbitW: "68%", orbitH: "58%", duration: "52s", delay: "-32.5s" },
  { id: 7, name: "Uranus", missionId: 7, subtitle: "Ice Giant World", fact: "A distant, cold ice giant", color: "#83d0d2", size: 104, orbitW: "77%", orbitH: "66%", duration: "61s", delay: "-45.75s" },
  { id: 8, name: "Neptune", missionId: 8, subtitle: "Deep Space World", fact: "A deep-blue world far from the Sun", color: "#6385ec", size: 100, orbitW: "86%", orbitH: "74%", duration: "70s", delay: "-61.25s" },
  { id: 9, name: "Pluto", missionId: null, subtitle: "Kuiper Belt Bonus World", fact: "A small icy dwarf planet beyond Neptune", color: "#b7a7a0", size: 52, orbitW: "96%", orbitH: "82%", duration: "82s", delay: "-20s", bonus: true },
];

const FLIGHT_DURATION = 5200;

function calculateFlightVector() {
  // These values match the CSS positions of the destination planet and rocket.
  // The rocket's final center is calculated to meet the selected planet's center.
  const width = window.innerWidth || 1280;
  const height = window.innerHeight || 800;
  const mobile = width <= 640;
  const destinationSize = mobile
    ? Math.min(220, Math.max(150, width * 0.38))
    : Math.min(310, Math.max(170, width * 0.27));
  const destinationLeft = width * (mobile ? 0.52 : 0.68);
  const destinationTop = height * (mobile ? 0.43 : 0.35);
  const rocketSize = 72;
  const rocketLeft = width * (mobile ? 0.05 : 0.09);
  const rocketTop = height * (mobile ? 0.78 : 0.76);

  const endX = destinationLeft + destinationSize / 2 - (rocketLeft + rocketSize / 2);
  const endY = destinationTop + destinationSize / 2 - (rocketTop + rocketSize / 2);

  return {
    x: `${endX}px`,
    y: `${endY}px`,
    midX: `${endX * 0.68}px`,
    midY: `${endY * 0.68}px`,
  };
}

export default function Missions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [missions, setMissions] = useState([]);
  const [progression, setProgression] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlanetId, setSelectedPlanetId] = useState(null);
  const [hoveredPlanetId, setHoveredPlanetId] = useState(null);
  const [difficulty, setDifficulty] = useState(() => {
    try { const saved = localStorage.getItem("paradox_last_difficulty"); return LEVELS.includes(saved) ? saved : "Easy"; } catch { return "Easy"; }
  });
  function chooseDifficulty(level) {
    setDifficulty(level);
    try { localStorage.setItem("paradox_last_difficulty", level); } catch { /* ignore */ }
  }
  const [launch, setLaunch] = useState(null);
  // Visual only: show the planets as the animated orbit view or as a level map.
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("paradox_solar_view") || "orbit");
  function changeView(mode) { setViewMode(mode); localStorage.setItem("paradox_solar_view", mode); }

  useEffect(() => {
    let active = true;

    authFetch(`${API_BASE_URL}/api/missions`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Could not load mission worlds.");
        }
        if (!Array.isArray(data)) {
          throw new Error("The mission service returned an invalid response.");
        }
        return data;
      })
      .then((data) => {
        if (active) {
          setMissions(data);
          const focusPlanet = Number(searchParams.get("planet"));
          if (focusPlanet >= 1 && focusPlanet <= 9) setSelectedPlanetId(focusPlanet);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || "Could not load mission worlds.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    authFetch(`${API_BASE_URL}/api/account/summary`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Could not load planet progress.");
        if (active) setProgression(data.progression || null);
      })
      .catch((err) => console.warn("Planet progression unavailable:", err.message));

    return () => {
      active = false;
    };
  }, [searchParams]);

  const selectedPlanet = PLANETS.find((planet) => planet.id === selectedPlanetId) || null;
  const selectedMission = useMemo(
    () => missions.find((mission) => Number(mission.id) === selectedPlanet?.missionId) || null,
    [missions, selectedPlanet]
  );

  function getPlanetProgress(planet) {
    return progression?.planets?.find((item) => Number(item.mission_id) === Number(planet.missionId)) || null;
  }

  function isPlanetUnlocked(planet) {
    if (planet.bonus) return Boolean(progression?.beyond_neptune_unlocked);
    if (planet.id === 1) return true;
    return Boolean(getPlanetProgress(planet)?.unlocked);
  }

  useEffect(() => {
    if (!selectedPlanetId) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") setSelectedPlanetId(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedPlanetId]);

  useEffect(() => {
    if (!launch) return undefined;

    const timer = window.setTimeout(() => {
      navigate(launch.targetPath || `/mission/${launch.mission.id}?scenario=${launch.scenario.id}&difficulty=${encodeURIComponent(launch.difficulty)}&autostart=1`);
    }, FLIGHT_DURATION);

    return () => window.clearTimeout(timer);
  }, [launch, navigate]);

  function startFlight(scenario) {
    if (!selectedPlanet || !selectedMission || launch || !isPlanetUnlocked(selectedPlanet)) return;
    const planetProgress = getPlanetProgress(selectedPlanet);
    const allowedScenarioIds = planetProgress?.unlocked_scenario_ids
      ?? (isPlanetUnlocked(selectedPlanet) ? selectedMission.scenarios.map((item) => item.id) : []);
    if (!allowedScenarioIds.includes(scenario.id)) return;

    setLaunch({
      planet: selectedPlanet,
      mission: selectedMission,
      scenario,
      difficulty,
      flight: calculateFlightVector(),
    });
    setSelectedPlanetId(null);
  }

  function startBonusFlight() {
    if (!selectedPlanet?.bonus || !isPlanetUnlocked(selectedPlanet) || launch) return;
    setLaunch({
      planet: selectedPlanet,
      mission: { id: 9, title: "Cosmic Speed Quiz" },
      scenario: { id: 1, name: "Ten Questions · Two Minutes" },
      difficulty,
      targetPath: "/time-attack",
      flight: calculateFlightVector(),
    });
    setSelectedPlanetId(null);
  }

  const totalAdventures = missions.reduce(
    (sum, mission) => sum + (mission.scenarios?.length || 0),
    0
  );

  return (
    <main className="solar-system-page">
      <header className="solar-heading">
        <span className="solar-kicker"><Sparkles size={14} /> PARADOX GALACTIC EXPLORER</span>
        <h1>Choose your <span>world.</span></h1>
        <p>
          Eight planets. Twenty-four adventures. One curious explorer.
          Select a world to discover what is waiting there. Finish each planet's adventures to unlock the next destination.
        </p>
        <div className="solar-counts">
          <span><b>8</b> PLANET WORLDS</span>
          <i />
          <span><b>{totalAdventures || 24}</b> ADVENTURES</span>
        </div>
        <Link to="/planet-smash" className="smash-entry">💥 Feeling grumpy? Play Planet Smash</Link>
        <div className="view-toggle" role="tablist" aria-label="Choose how to view the planets">
          <button type="button" role="tab" aria-selected={viewMode === "orbit"} className={viewMode === "orbit" ? "active" : ""} onClick={() => changeView("orbit")}>🪐 Orbit view</button>
          <button type="button" role="tab" aria-selected={viewMode === "map"} className={viewMode === "map" ? "active" : ""} onClick={() => changeView("map")}>🗺️ Level map</button>
        </div>
      </header>

      {loading && <div className="solar-status"><span className="loading-orbit" /> Mapping the Solar System…</div>}
      {error && <div className="solar-error">{error}</div>}

      {!loading && !error && (
        <>
          {viewMode === "map" ? (
            <LevelMap planets={PLANETS} getProgress={getPlanetProgress} isUnlocked={isPlanetUnlocked} onSelect={setSelectedPlanetId} disabled={Boolean(launch)} />
          ) : (
          <section className="solar-stage-wrap" aria-label="Interactive solar system">
            <div className="solar-stage">
              <div className="sun-halo" />
              <button
                className="solar-sun"
                type="button"
                onClick={() => setSelectedPlanetId(null)}
                aria-label="Sun, clear planet selection"
              >
                <span />
                <b>SUN</b>
              </button>

              {PLANETS.map((planet) => {
                const mission = missions.find((item) => Number(item.id) === planet.missionId);
                const isSelected = selectedPlanetId === planet.id;

                return (
                  <div
                    key={planet.id}
                    className={`planet-orbit-track ${isSelected ? "planet-track-selected" : ""} ${hoveredPlanetId === planet.id ? "planet-track-hovered" : ""}`}
                    style={{
                      "--orbit-w": planet.orbitW,
                      "--orbit-h": planet.orbitH,
                      "--orbit-duration": planet.duration,
                      "--orbit-delay": planet.delay,
                      zIndex: isSelected ? 120 : hoveredPlanetId === planet.id ? 110 : planet.id,
                    }}
                  >
                    <div className="orbit-line" />
                    <div className="planet-orbit-position">
                      <button
                        type="button"
                        className={`planet-anchor ${isSelected ? "planet-anchor-active" : ""} ${hoveredPlanetId === planet.id ? "planet-anchor-hovered" : ""}`}
                        onClick={() => setSelectedPlanetId(planet.id)}
                        onMouseEnter={() => setHoveredPlanetId(planet.id)}
                        onMouseLeave={() => setHoveredPlanetId(null)}
                        onFocus={() => setHoveredPlanetId(planet.id)}
                        onBlur={() => setHoveredPlanetId(null)}
                        aria-label={`Explore ${planet.name}: ${mission?.title || planet.subtitle}${isPlanetUnlocked(planet) ? "" : " — locked, click to see how to unlock"}`}
                        aria-haspopup="dialog"
                        aria-expanded={isSelected}
                      >
                        <span
                          className={`planet-sphere planet-${planet.id}`}
                          style={{ "--planet-color": planet.color }}
                        >
                          {planet.id === 6 && <i className="saturn-rings" />}
                          {planet.id === 3 && <i className="earth-land" />}
                          {planet.id === 5 && <i className="jupiter-storm" />}
                          {planet.id === 9 && <i className="pluto-heart" />}
                          <i className="planet-light" />
                        </span>
                        <span className={`planet-label ${isPlanetUnlocked(planet) ? "planet-label-unlocked" : "planet-label-locked"}`}>
                          <b>{!isPlanetUnlocked(planet) && <Lock size={10} />} {planet.name}</b>
                          <small>{planet.bonus ? "BONUS WORLD" : (mission?.title || planet.subtitle)}</small>
                          {!planet.bonus && <i style={{ "--progress": `${((getPlanetProgress(planet)?.completed_scenarios || 0) / 3) * 100}%` }} />}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="solar-stage-hint">
              <Orbit size={15} /> Planets are in motion · click a world to explore
            </div>
          </section>
          )}

          {selectedPlanet && createPortal(
            <div
              className="mission-modal-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setSelectedPlanetId(null);
              }}
            >
              <section
                className="mission-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="planet-mission-title"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="console-close"
                  onClick={() => setSelectedPlanetId(null)}
                  aria-label="Close planet missions"
                >
                  <X size={20} />
                </button>

                <div className="mission-modal-hero">
                  <div className="mission-modal-planet-art">
                    <span
                      className={`planet-sphere planet-${selectedPlanet.id} planet-modal-sphere`}
                      style={{ "--planet-size": "142px", "--planet-color": selectedPlanet.color }}
                    >
                      {selectedPlanet.id === 6 && <i className="saturn-rings" />}
                      {selectedPlanet.id === 3 && <i className="earth-land" />}
                      {selectedPlanet.id === 5 && <i className="jupiter-storm" />}
                      {selectedPlanet.id === 9 && <i className="pluto-heart" />}
                      <i className="planet-light" />
                    </span>
                  </div>

                  <div className="mission-modal-title-copy">
                    <span className="solar-kicker">{selectedPlanet.bonus ? "BEYOND NEPTUNE · BONUS WORLD" : `PLANET ${String(selectedPlanet.id).padStart(2, "0")} · SPACE WORLD`}</span>
                    <h2 id="planet-mission-title">{selectedPlanet.name}</h2>
                    <p>{selectedPlanet.fact}</p>
                    <div className="mission-modal-main-mission">
                      {selectedPlanet.bonus ? "Cosmic Speed Quiz" : (selectedMission ? selectedMission.title : "Loading mission…")}
                    </div>
                    {selectedMission && <small>{selectedMission.category}</small>}
                  </div>
                </div>

                <div className="mission-modal-divider" />

                {!isPlanetUnlocked(selectedPlanet) ? (
                  <div className="planet-locked-panel">
                    <Lock size={28} />
                    <h3>This world is still locked</h3>
                    <p>Complete all three adventures on the previous planet to unlock {selectedPlanet.name}. Your next destination will appear automatically.</p>
                  </div>
                ) : selectedPlanet.bonus ? (
                  <div className="kuiper-quiz-panel">
                    <div className="mission-modal-section-heading">
                      <div><span className="solar-kicker">NEPTUNE COMPLETE · NEW FRONTIER</span><h3>Explore the Kuiper Belt</h3></div>
                      <span className="mission-count-pill">BONUS MISSION</span>
                    </div>
                    <p>Answer 10 space questions before the 2-minute cosmic timer runs out. Earn XP and a special Speed Scholar badge.</p>
                    <button type="button" className="bonus-quiz-launch" onClick={startBonusFlight}>Launch Cosmic Speed Quiz <Rocket size={18} /></button>
                  </div>
                ) : (
                  <>
                    <div className="mission-modal-section-heading">
                      <div>
                        <span className="solar-kicker">CHOOSE YOUR ADVENTURE</span>
                        <h3>{selectedMission?.scenarios?.length || 0} missions waiting for you</h3>
                      </div>
                      <span className="mission-count-pill">{getPlanetProgress(selectedPlanet)?.completed_scenarios || 0}/3 COMPLETE</span>
                    </div>

                    <div className="planet-progress-track"><i style={{ width: `${((getPlanetProgress(selectedPlanet)?.completed_scenarios || 0) / 3) * 100}%` }} /></div>

                    <div className="mission-difficulty-block">
                      <span className="solar-kicker">1 · CHOOSE YOUR MISSION LEVEL</span>
                      <DifficultyPicker value={difficulty} onChange={chooseDifficulty} compact />
                      <p className="mission-difficulty-detail">{DIFFICULTY_INFO[difficulty].detail}</p>
                      <span className="solar-kicker">2 · PICK AN ADVENTURE TO LAUNCH</span>
                    </div>

                    <div className="mission-console-list">
                      {selectedMission?.scenarios?.map((scenario, index) => {
                        const planetProgress = getPlanetProgress(selectedPlanet);
                        const scenarioUnlocked = (planetProgress?.unlocked_scenario_ids
                          ?? (isPlanetUnlocked(selectedPlanet) ? selectedMission?.scenarios?.map((item) => item.id) || [] : [])
                        ).includes(scenario.id);
                        const scenarioCompleted = (planetProgress?.completed_scenario_ids || []).includes(scenario.id);
                        return (
                          <button key={scenario.id} type="button" className={`scenario-launch-row ${scenarioCompleted ? "scenario-completed" : ""}`} onClick={() => startFlight(scenario)} disabled={!scenarioUnlocked || Boolean(launch)}>
                            <span className="scenario-index">{scenarioCompleted ? <CircleCheckBig size={18} /> : `0${index + 1}`}</span>
                            <span className="scenario-copy"><b>{scenario.name}</b><small>{scenario.problem}</small></span>
                            <span className="scenario-play">{scenarioCompleted ? "Replay" : scenarioUnlocked ? "Launch" : <><Lock size={13} /> Locked</>} <ChevronRight size={17} /></span>
                          </button>
                        );
                      })}
                      {!selectedMission && <p className="mission-loading-copy">Preparing this planet's adventures…</p>}
                    </div>

                    <p className="mission-console-note"><CircleCheckBig size={14} /> Each adventure has its own questions for every level. Complete all three to unlock the next planet.</p>
                  </>
                )}
              </section>
            </div>,
            document.body
          )}
        </>
      )}

      {launch && createPortal(
        <div className="rocket-flight-overlay" role="status" aria-live="polite">
          <div className="flight-stars" />
          <div className="flight-copy">
            <span>PARADOX FLIGHT CONTROL</span>
            <h2>Destination: {launch.planet.name}</h2>
            <p>{launch.scenario.name}</p>
            <small>Systems check · rocket in flight · planetary approach</small>
            <div className="flight-progress"><i /></div>
          </div>

          <div className="flight-destination-wrap">
            <div
              className={`flight-destination planet-sphere planet-${launch.planet.id}`}
              style={{ "--planet-color": launch.planet.color }}
            >
              {launch.planet.id === 6 && <i className="saturn-rings" />}
              {launch.planet.id === 3 && <i className="earth-land" />}
              {launch.planet.id === 5 && <i className="jupiter-storm" />}
              {launch.planet.id === 9 && <i className="pluto-heart" />}
              <i className="planet-light" />
            </div>
            <span className="flight-destination-label">{launch.planet.name.toUpperCase()}</span>
            <span className="flight-arrival-ring" />
          </div>

          <div className="rocket-trail" style={{
            "--flight-x": launch.flight.x,
            "--flight-y": launch.flight.y,
            "--flight-mid-x": launch.flight.midX,
            "--flight-mid-y": launch.flight.midY,
          }} />
          <Rocket
            className="flight-rocket"
            size={72}
            strokeWidth={1.5}
            style={{
              "--flight-x": launch.flight.x,
              "--flight-y": launch.flight.y,
              "--flight-mid-x": launch.flight.midX,
              "--flight-mid-y": launch.flight.midY,
            }}
          />

          <div className="flight-bottom">
            <span className="flight-dot" /> Rocket approaching {launch.planet.name}
          </div>
          <button className="flight-cancel" type="button" onClick={() => setLaunch(null)}>
            Cancel flight
          </button>
        </div>,
        document.body
      )}
    </main>
  );
}
