import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Rocket, Sparkles, X } from "lucide-react";

const steps = [
  { title: "Welcome to PARADOX, Explorer!", text: "Your space adventure starts here. You are the mission commander: curious, brave and ready to discover how the universe works.", icon: "🚀" },
  { title: "Choose a planet", text: "Visit the animated Solar System. Select a planet to reveal its adventures. Each world contains three investigation challenges.", icon: "🪐" },
  { title: "Launch your rocket", text: "Choose an adventure, watch your rocket travel to the planet, then enter Mission Control when you land.", icon: "✨" },
  { title: "Look, learn and decide", text: "Read the mission briefing, reveal clues, study the evidence and choose an action. You can learn from every result—mistakes are part of discovery.", icon: "🔭" },
  { title: "Earn stars and explore more", text: "Complete missions to earn XP, build your mission history and unlock explorer achievements. AI and branching adventures offer even more ways to learn.", icon: "🏆" },
];

export default function WelcomeTutorial() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [demoRevealed, setDemoRevealed] = useState(false);
  const [demoChoice, setDemoChoice] = useState("");

  useEffect(() => {
    const show = () => { setStep(0); setDemoRevealed(false); setDemoChoice(""); setOpen(true); };
    if (localStorage.getItem("paradox_tutorial_pending") === "1") show();
    window.addEventListener("paradox:show-tutorial", show);
    return () => window.removeEventListener("paradox:show-tutorial", show);
  }, []);

  function close() {
    localStorage.removeItem("paradox_tutorial_pending");
    localStorage.setItem("paradox_tutorial_seen", "1");
    setOpen(false);
  }

  if (!open) return null;
  const current = steps[step];
  return <div className="tutorial-backdrop" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
    <section className="tutorial-panel">
      <button className="tutorial-close" onClick={close} aria-label="Skip tutorial"><X /></button>
      <div className="tutorial-art"><div className="tutorial-orbit" /><span>{current.icon}</span><Sparkles className="tutorial-spark" /></div>
      <p className="auth-eyebrow">PARADOX EXPLORER ACADEMY · {step + 1}/{steps.length}</p>
      <h2 id="tutorial-title">{current.title}</h2>
      <p className="tutorial-copy">{current.text}</p>
      {step === 3 && <div className="tutorial-demo">
        <p className="tutorial-demo-label">TRY A MINI INVESTIGATION</p>
        <p className="tutorial-demo-clue">Telemetry clue: A rover's wheel motor is using more power than normal.</p>
        {!demoRevealed ? <button className="tutorial-demo-button" onClick={() => setDemoRevealed(true)}>Reveal another clue</button> : <>
          <p className="tutorial-demo-clue">New clue: The rover is moving slowly over rough ground.</p>
          <p className="tutorial-demo-question">What should the explorer do first?</p>
          <div className="tutorial-demo-options">
            <button className={demoChoice === "check" ? "chosen" : ""} onClick={() => setDemoChoice("check")}>Check the telemetry and terrain</button>
            <button className={demoChoice === "speed" ? "chosen" : ""} onClick={() => setDemoChoice("speed")}>Make the rover go faster</button>
          </div>
          {demoChoice && <p className="tutorial-demo-feedback">{demoChoice === "check" ? "Great thinking! Good explorers study the evidence before acting." : "Interesting idea! First, inspect the clues so you do not make the problem worse."}</p>}
        </>}
      </div>}
      <div className="tutorial-dots">{steps.map((item, index) => <span key={item.title} className={index === step ? "active" : ""} />)}</div>
      <div className="tutorial-actions">
        <button className="tutorial-skip" onClick={close}>Skip tutorial</button>
        <div className="flex gap-2">
          {step > 0 && <button className="tutorial-prev" onClick={() => { setDemoRevealed(false); setDemoChoice(""); setStep((value) => value - 1); }}><ArrowLeft size={17} /></button>}
          <button className="tutorial-next" onClick={() => { if (step === steps.length - 1) close(); else { setDemoRevealed(false); setDemoChoice(""); setStep((value) => value + 1); } }}>{step === steps.length - 1 ? "Start exploring" : "Next"} {step === steps.length - 1 ? <Rocket size={17} /> : <ArrowRight size={17} />}</button>
        </div>
      </div>
    </section>
  </div>;
}
