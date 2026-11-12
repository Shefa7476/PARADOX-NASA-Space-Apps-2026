import { useEffect, useRef, useState } from "react";
import { play, vibrate, duck } from "../audio/sfx";

// Cinematic rocket launch: 3-2-1 countdown, shake, fire + smoke, then warp-speed stars.
// It layers on top of the existing flight screen (which keeps its own timer and navigation),
// so no game logic is touched. Total length matches the 5.2s flight.
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Cinematic({ destination }) {
  const canvasRef = useRef(null);
  const rocketRef = useRef(null);
  const [step, setStep] = useState(3);       // 3,2,1, then "go"
  const [phase, setPhase] = useState("count"); // count -> launch -> warp

  useEffect(() => {
    const timers = [];
    const at = (ms, fn) => timers.push(window.setTimeout(fn, ms));
    play("beep"); vibrate(20);
    at(600, () => { setStep(2); play("beep"); vibrate(20); });
    at(1200, () => { setStep(1); play("beep"); vibrate(30); });
    at(1800, () => { setStep("go"); setPhase("launch"); play("go"); play("launch"); duck(3); vibrate([60, 30, 60, 30, 120]); });
    at(2700, () => setPhase("warp"));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return undefined;
    const g = c.getContext("2d");
    const fit = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    fit();
    window.addEventListener("resize", fit);
    const t0 = performance.now();
    const parts = [];
    const warp = Array.from({ length: 170 }, () => ({ a: Math.random() * Math.PI * 2, r: 10 + Math.random() * 120, s: 0.5 + Math.random() * 1.8 }));
    let raf = 0;
    let warpStart = 0;

    const emit = (x, y, n, power) => {
      for (let i = 0; i < n; i++) {
        const fire = Math.random() < 0.55;
        parts.push({ x: x + (Math.random() - 0.5) * 18, y, vx: (Math.random() - 0.5) * (2 + power), vy: 1.5 + Math.random() * (3 + power * 2), life: 0, max: 26 + Math.random() * 30, size: 5 + Math.random() * 9, fire });
      }
    };

    const frame = (now) => {
      const t = now - t0;
      g.clearRect(0, 0, c.width, c.height);
      const rect = rocketRef.current?.getBoundingClientRect();
      if (rect && t > 1100 && t < 2700) {
        const power = t < 1800 ? 0.6 : 3;
        emit(rect.left + rect.width / 2, rect.bottom - 10, t < 1800 ? 2 : 7, power);
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life++; p.x += p.vx; p.y += p.vy; p.size *= 1.012;
        if (p.life > p.max) { parts.splice(i, 1); continue; }
        const k = 1 - p.life / p.max;
        g.globalAlpha = k * (p.fire ? 0.9 : 0.45);
        g.fillStyle = p.fire ? (k > 0.6 ? "#fff3a8" : "#ff9a3c") : "#c7d2e4";
        g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill();
      }
      if (t > 2500) {
        if (!warpStart) warpStart = now;
        const w = Math.min(1, (now - warpStart) / 900);
        const cx = c.width / 2, cy = c.height / 2;
        g.globalAlpha = Math.min(1, w * 1.2);
        g.lineCap = "round";
        for (const s of warp) {
          const prev = s.r;
          s.r += s.s * (2 + w * 26) * (1 + s.r / 300);
          if (s.r > Math.hypot(cx, cy) + 40) { s.r = 8 + Math.random() * 60; s.a = Math.random() * Math.PI * 2; }
          g.strokeStyle = `rgba(190,240,255,${0.35 + Math.min(0.6, s.r / 600)})`;
          g.lineWidth = 1 + s.r / 220;
          g.beginPath();
          g.moveTo(cx + Math.cos(s.a) * prev, cy + Math.sin(s.a) * prev);
          g.lineTo(cx + Math.cos(s.a) * s.r, cy + Math.sin(s.a) * s.r);
          g.stroke();
        }
      }
      g.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", fit); };
  }, []);

  return (
    <div className={`cine cine-${phase}`} aria-hidden="true">
      <div className={`cine-stage ${step !== "go" && step !== 3 ? "cine-rumble" : ""} ${phase === "launch" ? "cine-shake" : ""}`}>
        <div className="cine-sky" />
        <div className="cine-dest">DESTINATION · {destination}</div>
        <div key={step} className={`cine-count ${step === "go" ? "go" : ""}`}>{step === "go" ? "BLAST OFF!" : step}</div>
        <div className="cine-pad" />
        <div ref={rocketRef} className={`cine-rocket ${phase !== "count" ? "away" : ""} ${step === 1 ? "shiver" : ""}`}>
          <svg viewBox="0 0 60 110" width="100%" height="100%">
            <path d="M30 2 C46 20 50 46 46 76 L14 76 C10 46 14 20 30 2Z" fill="#f4f8ff" />
            <path d="M30 2 C38 12 43 24 45 36 L15 36 C17 24 22 12 30 2Z" fill="#ff5d7a" />
            <circle cx="30" cy="54" r="9" fill="#2b6fe8" stroke="#cfe3ff" strokeWidth="3" />
            <circle cx="27" cy="51" r="3" fill="#bfe3ff" />
            <path d="M14 56 L2 86 L16 78Z" fill="#ff5d7a" /><path d="M46 56 L58 86 L44 78Z" fill="#ff5d7a" />
            <rect x="20" y="76" width="20" height="8" rx="3" fill="#8aa0c4" />
          </svg>
        </div>
      </div>
      <canvas ref={canvasRef} className="cine-canvas" />
    </div>
  );
}

export default function LaunchCinematic() {
  const [run, setRun] = useState(null);
  const active = useRef(false);

  useEffect(() => {
    if (reduceMotion()) return undefined;
    const check = () => {
      const el = document.querySelector(".rocket-flight-overlay");
      if (el && !active.current) {
        active.current = true;
        const name = (el.querySelector("h2")?.textContent || "").replace(/^Destination:\s*/i, "").toUpperCase();
        setRun({ id: performance.now(), destination: name });
      } else if (!el && active.current) {
        active.current = false;
        setRun(null);
      }
    };
    const mo = new MutationObserver(check);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  if (!run) return null;
  return (
    <>
      <Cinematic key={run.id} destination={run.destination} />
      <button type="button" className="cine-cancel" onClick={() => document.querySelector(".flight-cancel")?.click()}>Cancel flight</button>
    </>
  );
}
