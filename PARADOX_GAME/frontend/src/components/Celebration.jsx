import { useCallback, useEffect, useRef, useState } from "react";
import { Award } from "lucide-react";
import { onFx } from "../audio/fxBus";

const COLORS = ["#67e8f9", "#f9a8d4", "#fde68a", "#a78bfa", "#86efac", "#fb923c", "#ffffff"];
const SPARKLES = ["⭐", "✨", "💫"];

const MAX_PARTICLES = 150;

export default function Celebration() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(0);
  const lastBurstRef = useRef({});
  const timersRef = useRef([]);
  const [level, setLevel] = useState(null);
  const [badges, setBadges] = useState([]);
  const reducedMotionRef = useRef(false);

  const clearParticles = useCallback(() => {
    particlesRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const frame = useCallback(function drawFrame() {
    const canvas = canvasRef.current;
    if (!canvas) {
      rafRef.current = 0;
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      rafRef.current = 0;
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    const active = [];
    for (const particle of particlesRef.current) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.985;
      particle.vy += particle.gravity;
      particle.rotation += particle.spin;
      particle.life -= 1;

      if (particle.life <= 0 || particle.y > canvas.height + 30) continue;
      active.push(particle);

      context.save();
      context.globalAlpha = Math.min(1, particle.life / particle.fadeAt);
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      if (particle.emoji) {
        context.font = `${particle.size}px system-ui, sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(particle.emoji, 0, 0);
      } else {
        context.fillStyle = particle.color;
        context.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.66);
      }
      context.restore();
    }

    particlesRef.current = active.slice(-MAX_PARTICLES);
    if (particlesRef.current.length) {
      rafRef.current = requestAnimationFrame(drawFrame);
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
      rafRef.current = 0;
    }
  }, []);

  const burst = useCallback((kind) => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotionRef.current || document.hidden) return;

    const now = performance.now();
    const previous = lastBurstRef.current[kind] || 0;
    if (now - previous < 450) return;
    lastBurstRef.current[kind] = now;

    const width = canvas.width;
    const height = canvas.height;
    const add = (particle) => {
      particlesRef.current.push({
        gravity: 0,
        spin: (Math.random() - 0.5) * 0.12,
        rotation: Math.random() * Math.PI,
        life: 38,
        fadeAt: 38,
        ...particle,
      });
    };

    if (kind === "confetti") {
      // One finite celebration burst; never a continuous rain loop.
      for (let i = 0; i < 76; i++) {
        const fromLeft = i % 2 === 0;
        add({
          x: fromLeft ? 0 : width,
          y: height * (0.42 + Math.random() * 0.2),
          vx: (fromLeft ? 1 : -1) * (3 + Math.random() * 6),
          vy: -(5 + Math.random() * 8),
          gravity: 0.18,
          size: 6 + Math.random() * 8,
          color: COLORS[i % COLORS.length],
          life: 78 + Math.random() * 20,
          fadeAt: 30,
        });
      }
    } else {
      // Correct answers and badges get a brief radial sparkle, not falling stars.
      const cx = width * 0.5;
      const cy = height * 0.43;
      const count = kind === "sparkle" ? 9 : 12;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 1.1 + Math.random() * 2.2;
        add({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 13 + Math.random() * 10,
          emoji: SPARKLES[i % SPARKLES.length],
          life: 24 + Math.random() * 12,
          fadeAt: 24,
        });
      }
    }

    particlesRef.current = particlesRef.current.slice(-MAX_PARTICLES);
    if (!rafRef.current && particlesRef.current.length) {
      rafRef.current = requestAnimationFrame(frame);
    }
  }, [frame]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = media.matches;

    const fit = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.max(1, window.innerWidth);
      canvas.height = Math.max(1, window.innerHeight);
    };
    const onMotionChange = (event) => {
      reducedMotionRef.current = event.matches;
      if (event.matches) clearParticles();
    };

    fit();
    window.addEventListener("resize", fit);
    media.addEventListener?.("change", onMotionChange);

    return () => {
      window.removeEventListener("resize", fit);
      media.removeEventListener?.("change", onMotionChange);
      clearParticles();
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, [clearParticles]);

  useEffect(() => onFx(({ type, level: nextLevel, name, description }) => {
    if (type === "route") {
      clearParticles();
      return;
    }
    if (type === "success") burst("confetti");
    if (type === "levelup") {
      burst("confetti");
      setLevel(nextLevel);
      const timer = window.setTimeout(() => setLevel(null), 3000);
      timersRef.current.push(timer);
    }
    if (type === "achievement") {
      const id = `${Date.now()}-${Math.random()}`;
      setBadges((current) => [...current.slice(-2), { id, name, description }]);
      burst("sparkle");
      const timer = window.setTimeout(
        () => setBadges((current) => current.filter((badge) => badge.id !== id)),
        3800,
      );
      timersRef.current.push(timer);
    }
    if (type === "correct") burst("sparkle");
  }), [burst, clearParticles]);

  return (
    <>
      <canvas ref={canvasRef} className="celebration-canvas" aria-hidden="true" />
      {level && (
        <div className="levelup-pop" role="status">
          <span>⭐ LEVEL UP! ⭐</span>
          <b>Level {level}</b>
          <small>You are getting stronger, explorer!</small>
        </div>
      )}
      <div className="badge-toasts" aria-live="polite">
        {badges.map((badge) => (
          <div key={badge.id} className="badge-toast">
            <Award size={26} />
            <div>
              <small>NEW BADGE UNLOCKED</small>
              <b>{badge.name}</b>
              {badge.description && <span>{badge.description}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
