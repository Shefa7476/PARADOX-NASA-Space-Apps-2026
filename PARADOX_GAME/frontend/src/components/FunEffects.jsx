import { useEffect } from "react";

// Purely visual delight: sparkle burst on every click and soft 3D tilt on cards.
const TILT = ".home-feature,.auth-panel,.achievement-item,.account-stat-grid>div,.planet-progress-row,.profile-panel,.account-welcome,.quiz-start-panel";
const EMOJI = ["⭐", "✨", "🌟", "💫", "🪐"];

export default function FunEffects() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onDown = (e) => {
      if (reduce) return;
      for (let i = 0; i < 7; i++) {
        const s = document.createElement("span");
        s.className = "spark-burst";
        s.textContent = EMOJI[Math.floor(Math.random() * EMOJI.length)];
        s.style.left = `${e.clientX}px`;
        s.style.top = `${e.clientY}px`;
        document.body.appendChild(s);
        const a = (Math.PI * 2 * i) / 7 + Math.random() * 0.6;
        const d = 38 + Math.random() * 38;
        const anim = s.animate(
          [{ transform: "translate(-50%,-50%) scale(.4)", opacity: 1 },
           { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d - 14}px)) scale(1.15) rotate(${Math.random() * 120 - 60}deg)`, opacity: 0 }],
          { duration: 650 + Math.random() * 250, easing: "cubic-bezier(.2,.8,.3,1)" }
        );
        anim.onfinish = () => s.remove();
      }
    };

    const onMove = (e) => {
      if (reduce || !e.target.closest) return;
      const el = e.target.closest(TILT);
      if (!el) return;
      el.classList.add("tilt-3d");
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--rx", `${(-py * 7).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(px * 9).toFixed(2)}deg`);
    };
    const onOut = (e) => {
      const el = e.target.closest && e.target.closest(".tilt-3d");
      if (el && !el.contains(e.relatedTarget)) { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); }
    };

    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onOut);
    };
  }, []);
  return null;
}
