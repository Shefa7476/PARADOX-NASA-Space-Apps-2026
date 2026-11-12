import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { duck, play, setPaused, unlock, vibrate } from "../audio/sfx";
import MusicCenter from "./MusicCenter";
import { emitFx, onFx } from "../audio/fxBus";

const CLICKABLE = "button, a[href], [role='button'], .quiz-level-card, summary";

// Watches the page for game moments (right answer, mission result...) and announces them
// on the fx bus. It only OBSERVES the DOM, so no game logic file had to change.
function detect(node) {
  if (node.nodeType !== 1) return null;
  const q = (sel) => (node.matches?.(sel) ? node : node.querySelector?.(sel));
  const outcome = q(".mission-outcome-backdrop");
  if (outcome) return outcome.classList.contains("outcome-success") ? "success" : "fail";
  const quiz = q(".quiz-result-panel");
  if (quiz) return quiz.classList.contains("quiz-result-win") ? "success" : "fail";
  const ai = q(".ai-result-panel");
  if (ai) return ai.classList.contains("result-correct") ? "correct" : "wrong";
  const fb = q(".quiz-feedback");
  if (fb) return fb.classList.contains("good") ? "correct" : "wrong";
  const step = q("p.text-green-400, p.text-red-400");
  if (step && step.closest(".bg-slate-800") && !window.location.pathname.startsWith("/debrief")) return step.classList.contains("text-green-400") ? "correct" : "wrong";
  return null;
}

export default function GameAudio() {
  const location = useLocation();

  // sounds on clicks + a soft tick on hover
  useEffect(() => {
    let lastHover = 0;
    const onDown = (e) => {
      unlock();
      const el = e.target.closest?.(CLICKABLE);
      if (!el || el.disabled) return;
      if (el.closest(".sound-dock")) { play("pop"); return; }
      const back = /back|return|skip|close/i.test(el.getAttribute("aria-label") || el.textContent || "");
      play(back ? "back" : "click");
      vibrate(8);
    };
    const onOver = (e) => {
      const el = e.target.closest?.(CLICKABLE);
      if (!el || el.disabled || el === e.relatedTarget || el.contains(e.relatedTarget)) return;
      const now = performance.now();
      if (now - lastHover < 90) return;
      lastHover = now;
      play("hover");
    };
    const onKey = () => unlock();
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("keydown", onKey, { passive: true });
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // page change whoosh
  useEffect(() => { play("whoosh"); emitFx("route", { path: location.pathname }); }, [location.pathname]);

  // DOM observer -> fx events
  useEffect(() => {
    let last = { type: "", at: 0 };
    const fire = (type) => {
      const now = performance.now();
      if (last.type === type && now - last.at < 700) return;
      last = { type, at: now };
      emitFx(type);
    };
    const mo = new MutationObserver((records) => {
      for (const r of records) for (const n of r.addedNodes) { const t = detect(n); if (t) fire(t); }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  // react to fx events with sound + haptics
  useEffect(() => onFx(({ type }) => {
    if (type === "correct") { play("correct"); vibrate(15); }
    if (type === "wrong") { play("wrong"); vibrate([30, 40, 30]); } // gentle double buzz
    if (type === "success") { duck(4); play("success"); vibrate([40, 60, 40, 60, 90]); }
    if (type === "fail") { duck(3); play("fail"); vibrate(60); }
    if (type === "levelup") { duck(3); play("levelup"); vibrate([30, 40, 30, 40, 120]); }
    if (type === "achievement") play("achievement");
    if (type === "avatar") play("star");
    if (type === "avatar-locked") play("wrong");
  }), []);

  return <MusicCenter />;
}
