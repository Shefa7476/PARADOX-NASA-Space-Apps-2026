import { useEffect, useRef } from "react";
import * as THREE from "three";

// Decorative WebGL background: twinkling stars, cartoon planet characters whose eyes follow
// the pointer, a smiling Moon, a waving astronaut, a UFO with blinking lights and a friendly rocket.
// UI only. It never touches game state, routes or API calls.
export default function SpaceScene3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return undefined; // no WebGL: the CSS background still works
    }
    const readPrefs = () => { try { return JSON.parse(localStorage.getItem("paradox_accessibility_preferences") || "{}"); } catch { return {}; } };
    let prefs = readPrefs();
    const deviceIsLight = (navigator.hardwareConcurrency || 4) <= 4 || (window.innerWidth <= 700 && (window.devicePixelRatio || 1) > 2);
    const systemReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let motionReduced = systemReduce || prefs.motion === "calm";
    const lowGraphics = prefs.graphics === "light" || (prefs.graphics !== "full" && deviceIsLight);
    let targetFps = lowGraphics ? 22 : 30;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowGraphics ? 1 : 1.25));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.z = 14;
    scene.add(new THREE.HemisphereLight(0xbfe9ff, 0x2b1d5c, 1.1));
    const sun = new THREE.DirectionalLight(0xfff1cc, 2.2);
    sun.position.set(6, 8, 10);
    scene.add(sun);

    // Stars
    const count = lowGraphics ? 260 : 560;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [new THREE.Color("#ffffff"), new THREE.Color("#9eefff"), new THREE.Color("#ffd6f5"), new THREE.Color("#fff2a8")];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 2] = -Math.random() * 60;
      const c = palette[i % palette.length];
      col.set([c.r, c.g, c.b], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.9 }));
    scene.add(stars);

    // ---------- cartoon helpers ----------
    const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05, ...extra });
    const black = mat("#1a1f3a", { roughness: 0.3 });
    const whiteM = mat("#ffffff", { roughness: 0.25 });
    const blush = mat("#ff8fb3", { transparent: true, opacity: 0.7 });
    const sphere = (r, m, seg = 20) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg - 6)), m);

    /** A face that can blink and look at the pointer. Returns { group, pupils, eyes } */
    function makeFace(r, { smile = true } = {}) {
      const face = new THREE.Group();
      const eyes = [];
      const pupils = [];
      [-1, 1].forEach((side) => {
        const eye = sphere(r * 0.2, whiteM, 16);
        eye.position.set(side * r * 0.33, r * 0.18, r * 0.86);
        eye.scale.set(1, 1.15, 0.6);
        const pupil = sphere(r * 0.1, black, 12);
        pupil.position.set(side * r * 0.33, r * 0.18, r * 0.98);
        const shine = sphere(r * 0.035, whiteM, 8);
        shine.position.set(0.03 * r, 0.04 * r, 0.06 * r);
        pupil.add(shine);
        pupil.userData.baseX = side * r * 0.33;
        pupil.userData.baseY = r * 0.18;
        const cheek = sphere(r * 0.13, blush, 12);
        cheek.position.set(side * r * 0.55, -r * 0.12, r * 0.8);
        cheek.scale.set(1, 0.55, 0.4);
        face.add(eye, pupil, cheek);
        eyes.push(eye);
        pupils.push(pupil);
      });
      if (smile) {
        const mouth = new THREE.Mesh(new THREE.TorusGeometry(r * 0.22, r * 0.035, 8, 24, Math.PI), black);
        mouth.position.set(0, -r * 0.12, r * 0.92);
        mouth.rotation.z = Math.PI;
        face.add(mouth);
      }
      return { face, eyes, pupils };
    }

    // ---------- cartoon planet characters ----------
    const planets = [];
    const faces = [];
    const defs = [
      { c: "#ff8fab", r: 1.5, x: -8.5, y: 4.2, z: -4, ring: false, stripes: false },
      { c: "#ffd166", r: 1.15, x: 9, y: 3, z: -3, ring: true, stripes: false },
      { c: "#6ee7b7", r: 0.9, x: 8, y: -4.6, z: -2, ring: false, stripes: true },
      { c: "#7dd3fc", r: 1.3, x: -9.5, y: -4, z: -5, ring: false, stripes: false },
      { c: "#c4b5fd", r: 0.75, x: 2.5, y: 6.2, z: -8, ring: true, stripes: false },
    ];
    defs.forEach((d, i) => {
      const g = new THREE.Group();
      g.add(sphere(d.r, mat(d.c, { emissive: d.c, emissiveIntensity: 0.14 }), 32));
      if (d.stripes) {
        [-0.35, 0.1].forEach((y) => {
          const band = new THREE.Mesh(new THREE.TorusGeometry(d.r * Math.cos(Math.asin(y)) * 1.0, d.r * 0.06, 8, 40), mat("#34d399"));
          band.position.y = y * d.r;
          band.rotation.x = Math.PI / 2;
          g.add(band);
        });
      }
      if (d.ring) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(d.r * 1.65, d.r * 0.1, 12, 64), mat("#fff1c9", { roughness: 0.4 }));
        ring.rotation.x = Math.PI / 2.4;
        g.add(ring);
      }
      const f = makeFace(d.r);
      g.add(f.face);
      g.position.set(d.x, d.y, d.z);
      g.userData = { baseY: d.y, baseX: d.x, phase: i * 1.3, wobble: 0.15 + i * 0.03, blinkAt: 2 + i * 1.7 };
      scene.add(g);
      planets.push(g);
      faces.push(f);
    });

    // ---------- smiling Moon with craters ----------
    const moon = new THREE.Group();
    moon.add(sphere(0.65, mat("#e5e7eb", { emissive: "#cbd5e1", emissiveIntensity: 0.15 }), 28));
    [[0.3, 0.35, 0.5], [-0.35, -0.25, 0.5], [0.15, -0.45, 0.4]].forEach(([x, y, z]) => {
      const crater = sphere(0.12, mat("#c4c9d4"), 10);
      crater.position.set(x, y, z);
      crater.scale.set(1, 1, 0.35);
      moon.add(crater);
    });
    const moonFace = makeFace(0.65);
    moon.add(moonFace.face);
    moon.position.set(-3.5, -6, -3);
    scene.add(moon);
    faces.push(moonFace);

    // ---------- floating astronaut ----------
    const astro = new THREE.Group();
    const suit = mat("#f8fafc", { roughness: 0.35 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.45, 8, 16), suit);
    const helmet = sphere(0.48, suit, 24);
    helmet.position.y = 0.78;
    const visor = sphere(0.36, mat("#312e81", { emissive: "#38bdf8", emissiveIntensity: 0.25, roughness: 0.1, metalness: 0.4 }), 20);
    visor.position.set(0, 0.8, 0.2);
    visor.scale.set(1, 0.8, 0.8);
    const pack = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.35, 6, 12), mat("#94a3b8"));
    pack.position.set(0, 0.1, -0.38);
    const panel = sphere(0.1, mat("#fcd34d", { emissive: "#fcd34d", emissiveIntensity: 0.5 }), 10);
    panel.position.set(0, 0.1, 0.42);
    astro.add(torso, helmet, visor, pack, panel);
    const armR = new THREE.Group();
    const armMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.4, 6, 10), suit);
    armMesh.position.y = 0.3;
    const glove = sphere(0.15, mat("#ff8fb3"), 12);
    glove.position.y = 0.62;
    armR.add(armMesh, glove);
    armR.position.set(0.5, 0.25, 0);
    const armL = armR.clone();
    armL.position.set(-0.5, 0.25, 0);
    armL.rotation.z = 2.4;
    [-0.2, 0.2].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.35, 6, 10), suit);
      leg.position.set(x, -0.65, 0);
      astro.add(leg);
    });
    astro.add(armR, armL);
    astro.position.set(5, 0.5, -1);
    astro.scale.setScalar(0.85);
    scene.add(astro);

    // ---------- UFO with blinking lights ----------
    const ufo = new THREE.Group();
    const saucer = sphere(0.9, mat("#a5b4fc", { metalness: 0.5, roughness: 0.3 }), 28);
    saucer.scale.set(1, 0.28, 1);
    const dome = sphere(0.45, mat("#a7f3d0", { transparent: true, opacity: 0.75, emissive: "#34d399", emissiveIntensity: 0.3 }), 20);
    dome.position.y = 0.2;
    const alien = sphere(0.22, mat("#86efac"), 14);
    alien.position.y = 0.25;
    const alienEyes = makeFace(0.22, { smile: true });
    alien.add(alienEyes.face);
    ufo.add(saucer, dome, alien);
    const ufoLights = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const light = sphere(0.07, new THREE.MeshBasicMaterial({ color: ["#fde68a", "#f472b6", "#67e8f9"][i % 3] }), 8);
      light.position.set(Math.cos(a) * 0.82, -0.02, Math.sin(a) * 0.82);
      ufo.add(light);
      ufoLights.push(light);
    }
    ufo.position.set(-14, 5.5, -6);
    scene.add(ufo);

    // ---------- twinkling star sparkles ----------
    const sparkles = [];
    for (let i = 0; i < (lowGraphics ? 6 : 12); i++) {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: ["#fde68a", "#ffffff", "#f9a8d4"][i % 3] }));
      star.position.set((Math.random() - 0.5) * 24, (Math.random() - 0.5) * 14, -2 - Math.random() * 6);
      star.userData.phase = Math.random() * Math.PI * 2;
      scene.add(star);
      sparkles.push(star);
    }

    // ---------- friendly rocket ----------
    const rocket = new THREE.Group();
    const white = mat("#ffffff", { roughness: 0.35 });
    const red = mat("#ff5d73", { roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.9, 8, 16), white);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.55, 16), red);
    nose.position.y = 0.97;
    const windowM = sphere(0.15, mat("#7dd3fc", { emissive: "#38bdf8", emissiveIntensity: 0.5 }), 16);
    windowM.position.set(0, 0.25, 0.28);
    rocket.add(body, nose, windowM);
    [-1, 1].forEach((side) => {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 4), red);
      fin.position.set(side * 0.36, -0.55, 0);
      fin.rotation.z = -side * 0.5;
      rocket.add(fin);
    });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 12), new THREE.MeshBasicMaterial({ color: "#ffb347" }));
    flame.position.y = -1.05;
    flame.rotation.x = Math.PI;
    rocket.add(flame);
    rocket.scale.setScalar(0.9);
    scene.add(rocket);

    const mouse = { x: 0, y: 0 };
    const onMove = (e) => { mouse.x = (e.clientX / window.innerWidth - 0.5) * 2; mouse.y = (e.clientY / window.innerHeight - 0.5) * 2; };
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", onResize);

    let raf = 0;
    let running = true;
    const clock = new THREE.Clock();
    let lastFrameAt = 0;
    const frame = (timestamp = 0) => {
      if (!running) return;
      if (timestamp - lastFrameAt < 1000 / targetFps) { raf = requestAnimationFrame(frame); return; }
      lastFrameAt = timestamp;
      const t = clock.getElapsedTime();
      stars.rotation.y = t * 0.012;
      stars.rotation.x = t * 0.005;
      planets.forEach((p) => {
        p.position.y = p.userData.baseY + Math.sin(t * 0.8 + p.userData.phase) * 0.45;
        p.rotation.y = Math.sin(t * 0.5 + p.userData.phase) * p.userData.wobble;
        p.rotation.z = Math.sin(t * 0.7 + p.userData.phase) * 0.08;
      });
      // eyes follow the pointer, and everyone blinks now and then
      faces.forEach((f, i) => {
        f.pupils.forEach((pu) => {
          pu.position.x = pu.userData.baseX + mouse.x * 0.06 * (1 + (i % 2));
          pu.position.y = pu.userData.baseY - mouse.y * 0.05 * (1 + (i % 2));
        });
        const blink = (t + i * 1.7) % 4.2 < 0.12 ? 0.1 : 1.15;
        f.eyes.forEach((e) => { e.scale.y = blink; });
      });
      moon.position.y = -6 + Math.sin(t * 0.6) * 0.3;
      moon.rotation.z = Math.sin(t * 0.4) * 0.15;
      astro.position.y = 0.5 + Math.sin(t * 0.9) * 0.5;
      astro.position.x = 5 + Math.sin(t * 0.25) * 1.2;
      astro.rotation.z = Math.sin(t * 0.5) * 0.25;
      astro.rotation.y = Math.sin(t * 0.3) * 0.4;
      armR.rotation.z = -0.4 + Math.sin(t * 6) * 0.45; // waving
      const u = (t * 0.03 + 0.5) % 1;
      ufo.position.set(-14 + u * 28, 5.2 + Math.sin(u * Math.PI * 6) * 0.6, -6);
      ufo.rotation.y = t * 1.5;
      ufo.rotation.z = Math.sin(t * 2) * 0.08;
      ufoLights.forEach((l, i) => { l.visible = Math.floor(t * 6 + i) % 2 === 0; });
      sparkles.forEach((st) => {
        const sc = 0.6 + Math.abs(Math.sin(t * 2 + st.userData.phase)) * 0.9;
        st.scale.setScalar(sc);
        st.rotation.y = t + st.userData.phase;
      });
      // Rocket loops across the sky, bobbing as it goes
      const k = (t * 0.045) % 1;
      rocket.position.set(-13 + k * 26, Math.sin(k * Math.PI * 2) * 2.2 + 1.2, -1.5);
      rocket.rotation.z = -Math.PI / 2 + Math.cos(k * Math.PI * 2) * 0.35;
      flame.scale.y = 0.8 + Math.sin(t * 20) * 0.25;
      // Gentle parallax with the mouse and page scroll
      camera.position.x += (mouse.x * 0.8 - camera.position.x) * 0.04;
      camera.position.y += ((-mouse.y * 0.6 - window.scrollY * 0.004) - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    if (motionReduced) renderer.render(scene, camera); else frame();

    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!running && !motionReduced) { running = true; frame(); }
    };
    document.addEventListener("visibilitychange", onVis);
    const onPreferences = () => {
      prefs = readPrefs();
      const light = prefs.graphics === "light" || (prefs.graphics !== "full" && deviceIsLight);
      targetFps = light ? 22 : 30;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, light ? 1 : 1.25));
      stars.material.opacity = light ? 0.45 : 0.9;
      stars.geometry.setDrawRange(0, light ? Math.min(260, count) : count);
      motionReduced = systemReduce || prefs.motion === "calm";
      if (motionReduced) { running = false; cancelAnimationFrame(raf); renderer.render(scene, camera); }
      else if (!document.hidden && !running) { running = true; frame(); }
    };
    window.addEventListener("paradox:preferences-updated", onPreferences);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("paradox:preferences-updated", onPreferences);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="scene3d" aria-hidden="true" />;
}
