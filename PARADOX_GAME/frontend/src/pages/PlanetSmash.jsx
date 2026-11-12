import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Rocket, Wind, Zap } from "lucide-react";
import { play, vibrate, duck } from "../audio/sfx";
import { emitFx } from "../audio/fxBus";
import { NovaAstronaut } from "../components/Cartoons";
import { SMASH_TARGETS, targetById } from "../data/smashTargets";
import { changeEnergy, getEnergy, subscribeEnergy } from "../services/energy";
import { PlanetBuddy } from "../components/Cartoons";
import "../styles/mission-play.css";
import "../styles/planet-smash.css";

// Planet Smash: a let-off-steam mini-game. Drag back from the rocket (or tap a
// target, or use arrow keys + Space) to launch. Cartoon planets wobble, go
// dizzy, burst into confetti and then always bounce back together, smiling.
// Real planets are never harmed, and a Calm Corner breathing break is one tap away.

const PLANET_TYPES = SMASH_TARGETS.filter((t) => t.id !== "Sun");
const ROCKETS = {
  classic: { label: "Classic", body: "#f8fafc", fin: "#ff5d73", flame: "#ffb347" },
  bubble: { label: "Bubble", body: "#a5f3fc", fin: "#38bdf8", flame: "#c4b5fd" },
  rainbow: { label: "Rainbow", body: "#fef08a", fin: "#a855f7", flame: "#f472b6" },
};
const CHEERS = ["KA-BOOM! 💥", "Planet POP! 🎉", "Wheee! 🌟", "SPLAT! 🍬", "Super smash! ⚡", "Bonk! 😵‍💫"];
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "calm";

function makePlanet(w, h, i, type = null) {
  const t = type || PLANET_TYPES[(i + Math.floor(Math.random() * PLANET_TYPES.length)) % PLANET_TYPES.length];
  const big = Boolean(type);
  const r = big ? Math.min(95, Math.max(62, Math.min(w, h) * 0.16)) : 30 + Math.random() * 26;
  return {
    ...t, id: Math.random(), r,
    name: t.id, x: big ? w / 2 : r + Math.random() * (w - 2 * r), y: big ? h * 0.32 : r + 20 + Math.random() * (h * 0.5 - r),
    vx: (Math.random() - 0.5) * (big ? 0.9 : 0.6), vy: (Math.random() - 0.5) * 0.4, hp: big ? 3 : r > 45 ? 2 : 1, maxHp: big ? 3 : r > 45 ? 2 : 1,
    state: "ok", timer: 0, wobble: 0, blink: Math.random() * 200,
  };
}

export default function PlanetSmash() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const game = useRef(null);
  const [score, setScore] = useState(0);
  const [grr, setGrr] = useState(100);
  const [best, setBest] = useState(() => { try { return Number(localStorage.getItem("paradox_smash_best") || 0); } catch { return 0; } });
  const [toast, setToast] = useState("");
  const [skin, setSkin] = useState("classic");
  const [searchParams, setSearchParams] = useSearchParams();
  const target = targetById(searchParams.get("target"));
  const targetRef = useRef(target);
  targetRef.current = target;
  const [energy, setEnergy] = useState(getEnergy().value);
  useEffect(() => subscribeEnergy((e) => setEnergy(e.value)), []);
  const [mega, setMega] = useState(false);
  const [calm, setCalm] = useState(false);
  const [aimHelp, setAimHelp] = useState(true);
  const skinRef = useRef(skin);
  skinRef.current = skin;
  const megaRef = useRef(mega);
  megaRef.current = mega;

  const say = useCallback((text) => {
    setToast(text);
    window.clearTimeout(say.t);
    say.t = window.setTimeout(() => setToast(""), 1400);
  }, []);

  // ---------------------------------------------------------- game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const g = { planets: [], rockets: [], particles: [], rings: [], aim: null, shake: 0, w: 800, h: 520, dpr: 1, combo: 0, comboAt: 0, smashes: 0, raf: 0 };
    game.current = g;
    if (import.meta.env.DEV) window.__paradoxSmash = g; // test hook (development builds only)

    const fit = () => {
      // clientWidth = layout size (not affected by page-enter transforms)
      g.dpr = Math.min(window.devicePixelRatio || 1, 2);
      g.w = wrapRef.current.clientWidth || 800;
      g.h = Math.max(340, Math.min(600, window.innerHeight - 140)); // whole stage fits on screen
      canvas.width = g.w * g.dpr;
      canvas.height = g.h * g.dpr;
      canvas.style.height = `${g.h}px`;
      if (!g.planets.length) g.planets = spawn();
    };
    fit();
    window.addEventListener("resize", fit);
    // bring the whole play area (including the launch pad) into view
    const scrollTimer = window.setTimeout(() => wrapRef.current?.scrollIntoView({ block: "end", behavior: reduceMotion() ? "auto" : "smooth" }), 700);

    const pad = () => ({ x: g.w / 2, y: g.h - 46 });
    function spawn() {
      const chosen = targetRef.current;
      if (chosen) return [makePlanet(g.w, g.h, 0, chosen)];
      return Array.from({ length: g.w < 560 ? 4 : 6 }, (_, i) => makePlanet(g.w, g.h, i));
    }
    g.respawn = () => { g.planets = spawn(); g.rockets = []; };

    const burst = (p, big) => {
      const n = reduceMotion() ? 18 : big ? 90 : 55;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1.5 + Math.random() * (big ? 7 : 5);
        const kind = Math.random();
        g.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 0, max: 45 + Math.random() * 35,
          size: 3 + Math.random() * 6, color: kind < 0.45 ? p.color : kind < 0.7 ? p.dark : ["#fde68a", "#f9a8d4", "#a5f3fc", "#ffffff"][i % 4],
          shape: kind < 0.45 ? "chunk" : kind < 0.8 ? "confetti" : "star", spin: Math.random() * 6 });
      }
      g.rings.push({ x: p.x, y: p.y, r: p.r * 0.6, max: p.r * (big ? 4 : 2.8), life: 0 });
      if (!reduceMotion()) g.shake = big ? 16 : 10;
    };

    const hit = (p, rocket) => {
      p.wobble = 1;
      p.hp -= rocket.mega ? 3 : 1;
      if (p.hp > 0) {
        p.state = "dizzy";
        p.timer = 50;
        play("wrong");
        vibrate(15);
        g.rings.push({ x: rocket.x, y: rocket.y, r: 6, max: 40, life: 0 });
        return;
      }
      p.state = "smashed";
      p.timer = 150; // frames until it reforms
      burst(p, rocket.mega);
      play("boom");
      vibrate([40, 30, 60]);
      const now = performance.now();
      g.combo = now - g.comboAt < 2500 ? g.combo + 1 : 1;
      g.comboAt = now;
      g.smashes += 1;
      const pts = 10 * g.combo * (rocket.mega ? 2 : 1);
      setScore((s) => {
        const next = s + pts;
        setBest((b) => { const nb = Math.max(b, next); try { localStorage.setItem("paradox_smash_best", String(nb)); } catch { /* ignore */ } return nb; });
        return next;
      });
      setGrr((v) => Math.max(0, v - (rocket.mega ? 14 : 8)));
      changeEnergy(rocket.mega ? 8 : 5); // smashing recharges space energy
      const cheer = p.name ? `${p.name} go BOOM! 💥` : CHEERS[g.smashes % CHEERS.length];
      say(g.combo > 1 ? `${g.combo}× COMBO! ${cheer}` : g.smashes % 2 ? cheer : CHEERS[g.smashes % CHEERS.length]);
      if (g.smashes % 5 === 0) { setMega(true); emitFx("achievement", { name: "Mega rocket ready!", description: "Your next launch is extra big." }); }
    };

    const launch = (tx, ty) => {
      const p = pad();
      const dx = tx - p.x;
      const dy = ty - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const speed = 9;
      const isMega = megaRef.current;
      g.rockets.push({ x: p.x, y: p.y - 10, vx: (dx / len) * speed, vy: (dy / len) * speed, trail: [], mega: isMega, skin: ROCKETS[skinRef.current] });
      if (isMega) setMega(false);
      play("launch");
      duck(1.2);
      setAimHelp(false);
    };
    g.launch = launch;

    // ---------- drawing helpers
    const drawPlanet = (p, t) => {
      if (p.state === "smashed") return;
      const wob = Math.sin(t * 0.4) * p.wobble * 6;
      const r = p.r + wob * 0.4;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(t * 0.3) * p.wobble * 0.3);
      if (p.state === "reform") { const k = 1 - p.timer / 40; ctx.scale(k, k); }
      if (p.ring) { ctx.strokeStyle = p.tilt ? "rgba(190,240,240,.7)" : "rgba(255,241,201,.85)"; ctx.lineWidth = p.tilt ? 3 : 5; ctx.beginPath(); ctx.ellipse(0, 4, p.tilt ? r * 0.45 : r * 1.6, p.tilt ? r * 1.5 : r * 0.42, -0.25, 0, Math.PI * 2); ctx.stroke(); }
      const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
      grad.addColorStop(0, "#ffffff"); grad.addColorStop(0.25, p.color); grad.addColorStop(1, p.dark);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
      if (p.sun) { ctx.restore(); ctx.save(); ctx.strokeStyle = "rgba(255,213,77,.85)"; ctx.lineWidth = 5; ctx.lineCap = "round"; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + t * 0.01; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08); ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip(); }
      if (p.stripes) { ctx.fillStyle = p.stripes; [-0.55, -0.15, 0.3, 0.65].forEach((y, i) => { ctx.globalAlpha = 0.45; ctx.fillRect(-r, y * r, r * 2, r * (i % 2 ? 0.12 : 0.18)); }); ctx.globalAlpha = 1; }
      if (p.spot) { ctx.fillStyle = "#c4553a"; ctx.beginPath(); ctx.ellipse(r * 0.35, r * 0.45, r * 0.22, r * 0.12, 0, 0, Math.PI * 2); ctx.fill(); }
      if (p.land) { ctx.fillStyle = "#3fbf7a"; ctx.beginPath(); ctx.ellipse(-r * 0.45, -r * 0.5, r * 0.35, r * 0.22, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(r * 0.5, r * 0.55, r * 0.4, r * 0.2, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fillRect(-r, -r, r * 2, r * 0.18); }
      if (p.craters) { ctx.fillStyle = "rgba(0,0,0,.14)"; [[-0.5, -0.55, 0.16], [0.55, -0.45, 0.12], [0.6, 0.6, 0.18], [-0.6, 0.55, 0.1]].forEach(([x, y, cr]) => { ctx.beginPath(); ctx.arc(x * r, y * r, cr * r, 0, Math.PI * 2); ctx.fill(); }); }
      if (p.heart) { ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.ellipse(r * 0.35, r * 0.5, r * 0.28, r * 0.2, -0.3, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      // cracks when damaged
      if (p.hp < p.maxHp) { ctx.strokeStyle = "rgba(30,20,50,.55)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.8); ctx.lineTo(0, -r * 0.3); ctx.lineTo(-r * 0.15, 0); ctx.lineTo(r * 0.2, r * 0.3); ctx.stroke(); }
      // face
      const target = g.rockets[0] || g.aim || pad();
      const look = Math.atan2(target.y - p.y, target.x - p.x);
      const ex = Math.cos(look) * r * 0.06; const ey = Math.sin(look) * r * 0.06;
      ctx.fillStyle = "#1a1f3a";
      if (p.state === "dizzy") {
        ctx.strokeStyle = "#1a1f3a"; ctx.lineWidth = 3;
        [-1, 1].forEach((s) => { const cx = s * r * 0.32; const cy = -r * 0.12; ctx.beginPath(); ctx.moveTo(cx - 6, cy - 6); ctx.lineTo(cx + 6, cy + 6); ctx.moveTo(cx + 6, cy - 6); ctx.lineTo(cx - 6, cy + 6); ctx.stroke(); });
        ctx.beginPath(); ctx.ellipse(0, r * 0.32, r * 0.13, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
        // orbiting dizzy stars
        for (let i = 0; i < 3; i++) { const a = t * 0.15 + (i * Math.PI * 2) / 3; ctx.fillStyle = "#fde68a"; ctx.font = "14px sans-serif"; ctx.fillText("★", Math.cos(a) * r * 0.9 - 6, -r - 6 + Math.sin(a) * 6); }
      } else {
        const blink = (t + p.blink) % 180 < 6;
        [-1, 1].forEach((s) => {
          ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(s * r * 0.32, -r * 0.12, r * 0.17, blink ? 1.5 : r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
          if (!blink) { ctx.fillStyle = "#1a1f3a"; ctx.beginPath(); ctx.arc(s * r * 0.32 + ex, -r * 0.1 + ey, r * 0.09, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s * r * 0.32 + ex + 2, -r * 0.14 + ey, r * 0.03, 0, Math.PI * 2); ctx.fill(); }
        });
        const scared = g.rockets.some((k) => Math.hypot(k.x - p.x, k.y - p.y) < r * 3.2);
        ctx.strokeStyle = "#1a1f3a"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath();
        if (scared) { ctx.fillStyle = "#1a1f3a"; ctx.ellipse(0, r * 0.3, r * 0.1, r * 0.13, 0, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.arc(0, r * 0.18, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
        ctx.fillStyle = "rgba(255,143,179,.55)";
        [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(s * r * 0.55, r * 0.15, r * 0.12, r * 0.07, 0, 0, Math.PI * 2); ctx.fill(); });
      }
      ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = "700 12px Nunito, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(p.name || "", 0, r + (p.ring && !p.tilt ? 22 : 16)); ctx.textAlign = "start";
      ctx.restore();
    };

    const drawRocket = (x, y, angle, skinDef, mega, flame) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      const s = mega ? 1.5 : 1;
      ctx.scale(s, s);
      ctx.fillStyle = skinDef.flame; ctx.beginPath(); ctx.moveTo(-6, 16); ctx.lineTo(0, 16 + flame); ctx.lineTo(6, 16); ctx.fill();
      ctx.fillStyle = skinDef.fin; ctx.beginPath(); ctx.moveTo(-9, 14); ctx.lineTo(-14, 20); ctx.lineTo(-7, 6); ctx.fill(); ctx.beginPath(); ctx.moveTo(9, 14); ctx.lineTo(14, 20); ctx.lineTo(7, 6); ctx.fill();
      ctx.fillStyle = skinDef.body; ctx.beginPath(); ctx.ellipse(0, 0, 9, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = skinDef.fin; ctx.beginPath(); ctx.moveTo(-8, -8); ctx.quadraticCurveTo(0, -26, 8, -8); ctx.fill();
      ctx.fillStyle = "#7dd3fc"; ctx.beginPath(); ctx.arc(0, -2, 4, 0, Math.PI * 2); ctx.fill();
      if (mega) { ctx.strokeStyle = "rgba(253,230,138,.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    };

    let t = 0;
    let last = performance.now();
    const loop = (now = performance.now()) => {
      // time-based: same game speed on fast PCs and slow tablets
      const dt = Math.max(0.5, Math.min(4, (now - last) / 16.67));
      last = now;
      t += dt;
      const { w, h } = g;
      ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      if (g.shake > 0) { ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake); g.shake *= Math.pow(0.85, dt); if (g.shake < 0.5) g.shake = 0; }

      // planets drift and bounce off walls
      g.planets.forEach((p) => {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < p.r || p.x > w - p.r) p.vx *= -1;
        if (p.y < p.r + 10 || p.y > h * 0.62) p.vy *= -1;
        p.wobble *= Math.pow(0.95, dt);
        if (p.timer > 0) {
          p.timer = Math.max(0, p.timer - dt);
          if (p.timer === 0 && p.state === "dizzy") p.state = "ok";
          if (p.state === "smashed" && p.timer <= 40) {
            p.timer = 40;
            // pieces fly back together
            p.state = "reform"; p.hp = p.maxHp;
            for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.particles.push({ x: p.x + Math.cos(a) * 80, y: p.y + Math.sin(a) * 80, vx: -Math.cos(a) * 2, vy: -Math.sin(a) * 2, life: 0, max: 38, size: 4, color: p.color, shape: "chunk", spin: 0 }); }
          }
          if (p.state === "reform" && p.timer === 0) { p.state = "ok"; play("star"); }
        }
        drawPlanet(p, t);
      });

      // rockets: gravity from nearby planets bends the path a little
      g.rockets.forEach((k) => {
        g.planets.forEach((p) => {
          if (p.state === "smashed") return;
          const dx = p.x - k.x; const dy = p.y - k.y; const d2 = dx * dx + dy * dy;
          const f = Math.min(0.25, (p.r * 6) / d2);
          k.vx += dx * f * 0.02 * dt; k.vy += dy * f * 0.02 * dt;
        });
        k.x += k.vx * dt; k.y += k.vy * dt;
        k.trail.push({ x: k.x, y: k.y });
        if (k.trail.length > 16) k.trail.shift();
        k.trail.forEach((pt, i) => { ctx.fillStyle = `rgba(253,186,116,${i / 22})`; ctx.beginPath(); ctx.arc(pt.x, pt.y, 2 + i * 0.35, 0, Math.PI * 2); ctx.fill(); });
        drawRocket(k.x, k.y, Math.atan2(k.vy, k.vx), k.skin, k.mega, 8 + Math.random() * 8);
        const target = g.planets.find((p) => (p.state === "ok" || p.state === "dizzy") && Math.hypot(p.x - k.x, p.y - k.y) < p.r + (k.mega ? 18 : 8));
        if (target) { k.dead = true; hit(target, k); if (k.mega) g.planets.forEach((p) => { if (p !== target && p.state !== "smashed" && Math.hypot(p.x - target.x, p.y - target.y) < 150) hit(p, { ...k, mega: false }); }); }
        if (k.x < -40 || k.x > w + 40 || k.y < -40 || k.y > h + 40) k.dead = true;
      });
      g.rockets = g.rockets.filter((k) => !k.dead);

      // particles + shockwaves
      g.particles.forEach((q) => {
        q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 0.06 * dt; q.vx *= Math.pow(0.99, dt);
        const a = 1 - q.life / q.max; if (a <= 0) return;
        ctx.globalAlpha = a; ctx.fillStyle = q.color;
        if (q.shape === "star") { ctx.font = `${q.size * 2.4}px sans-serif`; ctx.fillText("★", q.x, q.y); }
        else if (q.shape === "confetti") { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.life * 0.2 + q.spin); ctx.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2); ctx.restore(); }
        else { ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
      });
      g.particles = g.particles.filter((q) => q.life < q.max);
      g.rings.forEach((rg) => { rg.life += dt; const k = rg.life / 26; rg.r += (rg.max - rg.r) * 0.18; ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, 0.8 - k)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2); ctx.stroke(); });
      g.rings = g.rings.filter((rg) => rg.life < 26);
      ctx.restore();

      // launch pad + aim line + idle rocket
      const p = pad();
      ctx.fillStyle = "rgba(148,163,184,.35)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + 26, 54, 10, 0, 0, Math.PI * 2); ctx.fill();
      const aim = g.aim;
      const angle = aim ? Math.atan2(aim.y - p.y, aim.x - p.x) : -Math.PI / 2;
      if (aim) {
        ctx.setLineDash([6, 8]); ctx.strokeStyle = "rgba(253,230,138,.8)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(angle) * 140, p.y + Math.sin(angle) * 140); ctx.stroke(); ctx.setLineDash([]);
      }
      drawRocket(p.x, p.y, angle, ROCKETS[skinRef.current], megaRef.current, 4 + Math.sin(t * 0.5) * 3);
      g.raf = requestAnimationFrame(loop);
    };
    g.raf = requestAnimationFrame(loop);

    // ---------- input: drag-to-aim or tap target
    const toLocal = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * g.w) / (r.width || g.w), y: ((e.clientY - r.top) * g.h) / (r.height || g.h) };
    };
    let dragging = false;
    const down = (e) => { dragging = true; g.aim = toLocal(e); canvas.setPointerCapture?.(e.pointerId); };
    const move = (e) => { if (dragging || e.pointerType === "mouse") g.aim = toLocal(e); };
    const up = (e) => { if (!dragging) return; dragging = false; const pt = toLocal(e); if (pt.y < pad().y - 10) launch(pt.x, pt.y); };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointerleave", () => { if (!dragging) g.aim = null; });

    return () => {
      cancelAnimationFrame(g.raf);
      window.clearTimeout(scrollTimer);
      window.removeEventListener("resize", fit);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
    };
  }, [say]);

  // a new target from the chooser (or the Smash Break picker) replaces the planets
  const targetId = target?.id || "";
  useEffect(() => { game.current?.respawn?.(); }, [targetId]);
  function chooseTarget(id) { setSearchParams(id ? { target: id } : {}, { replace: true }); }

  // keyboard: ←/→ aim, Space/Enter launch
  const keyAngle = useRef(-Math.PI / 2);
  function onKeyDown(e) {
    const g = game.current;
    if (!g) return;
    const pad = { x: g.w / 2, y: g.h - 46 };
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      keyAngle.current = Math.max(-Math.PI + 0.15, Math.min(-0.15, keyAngle.current + (e.key === "ArrowLeft" ? -0.08 : 0.08)));
      g.aim = { x: pad.x + Math.cos(keyAngle.current) * 200, y: pad.y + Math.sin(keyAngle.current) * 200 };
    }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      g.launch(pad.x + Math.cos(keyAngle.current) * 200, pad.y + Math.sin(keyAngle.current) * 200);
    }
  }

  const calmMessage = grr <= 0 ? "Grr-o-meter empty! Feeling calmer? 🌈" : grr < 50 ? "Nice! Letting the grumpies out. 💨" : "Feeling grumpy? Blast some planets!";

  return (
    <main className="smash-page">
      <header className="smash-head">
        <Link to="/missions" className="mp-back"><ArrowLeft size={16} /> Solar System</Link>
        <div className="smash-title">
          <h1>Planet Smash <span aria-hidden="true">💥</span></h1>
          <p>Tired or grumpy? Pick any planet and launch rockets at it! Don't worry: cartoon planets always bounce back together, smiling. 🪐</p>
        </div>
      </header>

      <section className="smash-targets" aria-label="Choose which planet to crash">
        <span className="smash-targets-label">🎯 Pick your target:</span>
        <div className="smash-target-row" role="radiogroup">
          <button type="button" role="radio" aria-checked={!target} className={`st-chip ${!target ? "on" : ""}`} onClick={() => chooseTarget(null)}><span aria-hidden="true">🌌</span> All</button>
          {SMASH_TARGETS.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={target?.id === t.id} className={`st-chip ${target?.id === t.id ? "on" : ""}`} onClick={() => chooseTarget(t.id)}>
              <PlanetBuddy planet={t.id} size={26} mood={target?.id === t.id ? "happy" : "idle"} /> {t.id}
            </button>
          ))}
        </div>
      </section>

      <section className="smash-hud" aria-label="Game status">
        <div className="smash-energy" aria-label={`Space energy ${Math.round(energy)} percent`}>
          <small>Space energy 🔋</small>
          <i><em style={{ width: `${energy}%` }} /></i>
          <span>{energy >= 100 ? "Fully recharged! Ready to learn again 🚀" : "Every smash recharges you!"}</span>
        </div>
        <div className="smash-stat"><small>Score</small><b>{score}</b></div>
        <div className="smash-stat"><small>Best</small><b>{best}</b></div>
        <div className="smash-grr" aria-label={`Grr-o-meter ${grr}%`}>
          <small>Grr-o-meter 😤</small>
          <i><em style={{ width: `${grr}%` }} /></i>
          <span>{calmMessage}</span>
        </div>
        <div className="smash-skins" role="radiogroup" aria-label="Rocket style">
          {Object.entries(ROCKETS).map(([id, r]) => (
            <button key={id} type="button" role="radio" aria-checked={skin === id} className={skin === id ? "on" : ""} onClick={() => setSkin(id)}>
              <Rocket size={14} style={{ color: r.fin }} /> {r.label}
            </button>
          ))}
        </div>
        <button type="button" className="smash-calm" onClick={() => setCalm(true)}><Wind size={15} /> Calm corner</button>
      </section>

      <div className="smash-stage" ref={wrapRef}>
        <canvas ref={canvasRef} className="smash-canvas" tabIndex={0} onKeyDown={onKeyDown}
          aria-label="Planet Smash game. Drag or tap to aim and launch a rocket. Keyboard: left and right arrows to aim, Space to launch." />
        {mega && <div className="smash-mega"><Zap size={15} /> Mega rocket ready!</div>}
        {toast && <div className="smash-toast" key={toast + score}>{toast}</div>}
        {aimHelp && <div className="smash-help">👆 Drag up from the rocket (or tap a planet) to launch!<br /><small>Keyboard: ← → to aim, Space to launch</small></div>}
      </div>
      <p className="smash-fact">🧪 Space fact: in the game, planets' gravity bends your rocket's path, just like real spacecraft use gravity assists to swing around planets!</p>

      {calm && <CalmCorner onClose={() => { setCalm(false); setGrr((v) => Math.max(0, v - 20)); changeEnergy(20); }} />}
    </main>
  );
}

function CalmCorner({ onClose }) {
  const [phase, setPhase] = useState("in");
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setPhase((p) => {
        if (p === "out") setCount((c) => c + 1);
        return p === "in" ? "hold" : p === "hold" ? "out" : "in";
      });
    }, 4000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="calm-backdrop" role="dialog" aria-modal="true" aria-labelledby="calm-title">
      <div className="calm-panel">
        <NovaAstronaut size={90} mood="wave" />
        <h2 id="calm-title">Calm corner</h2>
        <div className={`calm-bubble ${phase}`} aria-live="polite">
          {phase === "in" ? "Breathe in… 🌬️" : phase === "hold" ? "Hold… ✨" : "Breathe out… 😌"}
        </div>
        <p>Follow the bubble. {count > 0 ? `${count} big space breath${count > 1 ? "s" : ""} done!` : "Three slow breaths help big feelings shrink."}</p>
        <p className="calm-tip">Still feeling upset? Talking to a grown-up you trust can really help. 💙</p>
        <button type="button" className="mp-btn primary" onClick={onClose}>I feel better: back to the game</button>
      </div>
    </div>
  );
}
