import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlarmClock, ArrowLeft, CircleCheckBig, Clock3, Rocket, Sparkles, Star, Trophy, Zap } from "lucide-react";
import { API_BASE_URL } from "../context/AuthContext";
import { authFetch } from "../services/api";
import "../styles/time-attack.css";

const QUESTIONS = [
  { q: "Which planet is closest to the Sun?", options: ["Mercury", "Earth", "Neptune"], answer: "Mercury", fact: "Mercury is the closest planet to our star." },
  { q: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Uranus"], answer: "Mars", fact: "Iron-rich dust gives Mars its reddish colour." },
  { q: "Which planet is our home?", options: ["Jupiter", "Saturn", "Earth"], answer: "Earth", fact: "Earth is the only world we know has life." },
  { q: "Which is the biggest planet in our Solar System?", options: ["Jupiter", "Mercury", "Mars"], answer: "Jupiter", fact: "Jupiter is so large that more than 1,300 Earths could fit inside it by volume." },
  { q: "Which planet has famous bright rings?", options: ["Saturn", "Venus", "Earth"], answer: "Saturn", fact: "Saturn's rings are made mostly of ice and rocky pieces." },
  { q: "What is the Sun?", options: ["A planet", "A star", "A moon"], answer: "A star", fact: "The Sun is the star at the centre of our Solar System." },
  { q: "What does Earth's Moon travel around?", options: ["Mars", "The Sun only", "Earth"], answer: "Earth", fact: "The Moon is Earth's natural satellite." },
  { q: "Which is the farthest of the eight planets from the Sun?", options: ["Neptune", "Venus", "Jupiter"], answer: "Neptune", fact: "Neptune is the eighth planet from the Sun." },
  { q: "Where do solar flares come from?", options: ["The Moon", "The Sun", "Saturn"], answer: "The Sun", fact: "Solar flares are powerful bursts of energy from the Sun." },
  { q: "Why do astronauts seem to float in orbit?", options: ["There is no gravity", "They are in continuous free-fall", "Space has no air"], answer: "They are in continuous free-fall", fact: "Astronauts and their spacecraft fall together around Earth, creating microgravity." },
];

const LEVELS = [
  { name: "Easy", hint: "Space explorer basics", icon: Star, color: "mint", points: "1× XP" },
  { name: "Medium", hint: "Think like a scientist", icon: Sparkles, color: "blue", points: "1.5× XP" },
  { name: "Hard", hint: "Challenge your space brain", icon: Zap, color: "purple", points: "2× XP" },
];

export default function TimeAttackQuiz() {
  const [progression, setProgression] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [difficulty, setDifficulty] = useState(() => localStorage.getItem("paradox_age_mode") === "6-8" ? "Easy" : "Medium");
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(120);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState("");
  const [feedback, setFeedback] = useState("");
  const [finished, setFinished] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const finishGuard = useRef(false);
  const scoreRef = useRef(0);
  const questions = QUESTIONS;
  const current = questions[questionIndex];

  useEffect(() => {
    let active = true;
    authFetch(`${API_BASE_URL}/api/account/summary`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Could not check your planet progress.");
        if (active) setProgression(data.progression || null);
      })
      .catch((err) => { if (active) setSaveError(err.message); })
      .finally(() => { if (active) setLoadingProgress(false); });
    return () => { active = false; };
  }, []);

  async function saveResult(didComplete, finalScore, remaining) {
    setSaving(true);
    setSaveError("");
    try {
      const response = await authFetch(`${API_BASE_URL}/api/quiz/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: finalScore,
          total_questions: 10,
          difficulty,
          completed: didComplete,
          elapsed_seconds: 120 - remaining,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Could not save your quiz result.");
      window.dispatchEvent(new Event("paradox:progress-updated"));
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function finishQuiz(didComplete, finalScore, remaining) {
    if (finishGuard.current) return;
    finishGuard.current = true;
    setFinished(true);
    setCompleted(didComplete);
    saveResult(didComplete, finalScore, remaining);
  }

  useEffect(() => {
    if (!started || finished) return undefined;
    const timer = window.setInterval(() => {
      setSeconds((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          finishQuiz(false, scoreRef.current, 0);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started, finished]);

  function chooseAnswer(answer) {
    if (!started || finished || selected) return;
    setSelected(answer);
    const correct = answer === current.answer;
    const finalScore = scoreRef.current + (correct ? 1 : 0);
    if (correct) {
      scoreRef.current = finalScore;
      setScore(finalScore);
      setFeedback(`Correct! ${current.fact}`);
    } else {
      setFeedback(`Good try! ${current.fact}`);
    }

    window.setTimeout(() => {
      if (finishGuard.current) return;
      const nextIndex = questionIndex + 1;
      if (nextIndex >= questions.length) {
        finishQuiz(true, finalScore, seconds);
      } else {
        setQuestionIndex(nextIndex);
        setSelected("");
        setFeedback("");
      }
    }, 850);
  }

  function beginQuiz() {
    finishGuard.current = false;
    scoreRef.current = 0;
    setSeconds(120);
    setQuestionIndex(0);
    setScore(0);
    setSelected("");
    setFeedback("");
    setFinished(false);
    setCompleted(false);
    setStarted(true);
    setSaveError("");
  }

  const unlocked = Boolean(progression?.beyond_neptune_unlocked);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const progressPercent = (questionIndex / questions.length) * 100;

  if (loadingProgress) return <main className="time-attack-page"><div className="time-attack-loading"><span className="quiz-orbit-loader" />Checking your Kuiper Belt access…</div></main>;

  if (!unlocked) {
    return (
      <main className="time-attack-page">
        <section className="quiz-locked-panel">
          <div className="quiz-lock-planet">♇</div>
          <span className="quiz-eyebrow">A SECRET WORLD IS WAITING</span>
          <h1>Unlock the Kuiper Belt</h1>
          <p>Complete all three Neptune adventures to open Pluto and launch the Cosmic Speed Quiz.</p>
          <Link to="/missions" className="quiz-primary-link"><ArrowLeft size={17} /> Return to the planets</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="time-attack-page">
      <div className="quiz-nebula quiz-nebula-one" /><div className="quiz-nebula quiz-nebula-two" />
      <header className="quiz-page-heading">
        <span className="quiz-eyebrow"><Sparkles size={14} /> PLUTO · KUIPER BELT CHALLENGE</span>
        <h1>Cosmic <span>Speed Quiz</span></h1>
        <p>Ten space questions. Two minutes. How much do you know about our universe?</p>
      </header>

      {!started && (
        <section className="quiz-start-panel">
          <div className="quiz-stopwatch-preview"><AlarmClock size={62} /><span>02:00</span></div>
          <h2>Ready, Commander?</h2>
          <p>Choose your challenge level. Answer all 10 questions before the cosmic stopwatch reaches zero.</p>
          <div className="quiz-level-grid">
            {LEVELS.map(({ name, hint, icon: Icon, color, points }) => (
              <button key={name} type="button" className={`quiz-level-card ${color} ${difficulty === name ? "active" : ""}`} onClick={() => setDifficulty(name)}>
                <Icon size={25} /><b>{name}</b><small>{hint}</small><em>{points}</em>
              </button>
            ))}
          </div>
          <button type="button" className="quiz-start-button" onClick={beginQuiz}><Rocket size={19} /> Start 2-minute challenge</button>
        </section>
      )}

      {started && !finished && current && (
        <section className="quiz-game-panel">
          <div className={`quiz-stopwatch ${seconds <= 20 ? "urgent" : ""}`}>
            <div className="quiz-watch-ring"><div className="quiz-watch-face"><Clock3 size={18} /><strong>{minutes}:{secs}</strong><small>TIME LEFT</small></div></div>
            <div className="quiz-watch-spark" />
          </div>
          <div className="quiz-game-topline"><span>QUESTION {questionIndex + 1} / 10</span><span>{score} CORRECT</span></div>
          <div className="quiz-progress-bar"><i style={{ width: `${progressPercent}%` }} /></div>
          <div className="quiz-question-card" key={questionIndex}>
            <span className="quiz-question-kicker">SPACE KNOWLEDGE CHECK</span>
            <h2>{current.q}</h2>
            <div className="quiz-answer-list">
              {current.options.map((option) => {
                const isSelected = selected === option;
                const isCorrect = selected && option === current.answer;
                return <button key={option} type="button" onClick={() => chooseAnswer(option)} disabled={Boolean(selected)} className={`${isSelected ? "selected" : ""} ${isCorrect ? "correct" : ""}`}>{option}{isCorrect && <CircleCheckBig size={18} />}</button>;
              })}
            </div>
            {feedback && <p className={`quiz-feedback ${selected === current.answer ? "good" : "try"}`}>{feedback}</p>}
          </div>
        </section>
      )}

      {finished && (
        <section className={`quiz-result-panel ${completed ? "quiz-result-win" : "quiz-result-timeout"}`}>
          <div className="quiz-result-art">{completed ? <Trophy size={82} /> : <AlarmClock size={82} />}</div>
          <span className="quiz-eyebrow">{completed ? "KUIPER BELT CHALLENGE COMPLETE" : "COSMIC CLOCK HAS RUN OUT"}</span>
          <h2>{completed ? "Congratulations, Commander!" : "Time's up!"}</h2>
          <p>{completed ? "You answered all 10 questions before time ran out. Amazing space knowledge!" : "The stopwatch has powered down. You can try again and beat the clock next time."}</p>
          <div className="quiz-score-display"><strong>{score}/10</strong><span>correct answers</span></div>
          {completed && <div className="quiz-big-congrats">✦ YOU DID IT! ✦</div>}
          {saving && <p className="quiz-saving">Saving your score to your explorer profile…</p>}
          {saveError && <p className="quiz-save-error">{saveError}</p>}
          <div className="quiz-result-actions"><button type="button" onClick={beginQuiz}>Play again</button><Link to="/account">View my rewards</Link><Link to="/missions">Return to Solar System</Link></div>
        </section>
      )}
      <footer className="quiz-footer"><Link to="/missions"><ArrowLeft size={15} /> Back to Solar System</Link><span><Zap size={13} /> {difficulty.toUpperCase()} MODE</span></footer>
    </main>
  );
}
