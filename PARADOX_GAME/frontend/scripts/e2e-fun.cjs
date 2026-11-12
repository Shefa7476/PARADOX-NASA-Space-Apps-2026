// PARADOX end-to-end: Planet Smash, sing-along songs, 3D scene, background characters.
// Usage (dev build running + backend): node scripts/e2e-fun.cjs [screenshot-folder]
const { chromium } = require("playwright");
const fs = require("fs");
const BASE = process.env.PARADOX_URL || "http://localhost:5173";
const API = process.env.PARADOX_API || "http://127.0.0.1:8000";
const SHOTS = process.argv[2] || "e2e-screenshots";
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const check = (name, ok, info = "") => { results.push({ name, ok: !!ok, info }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${info ? " :: " + info : ""}`); };

(async () => {
  const name = "fun_" + Date.now().toString(36);
  await fetch(API + "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: name, email: name + "@example.test", display_name: "Fun Kid", password: "rocket1234" }) });
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|503|WebGL|fonts\.g/i.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => localStorage.setItem("paradox_tutorial_seen", "1"));
  await page.goto(BASE + "/login");
  await page.locator("input").nth(0).fill(name);
  await page.locator('input[type="password"]').fill("rocket1234");
  await page.locator(".auth-submit").click();
  await page.waitForFunction(() => !!localStorage.getItem("paradox_access_token"));

  // ---- 3D scene + background cast
  await page.goto(BASE + "/");
  await page.waitForTimeout(1500);
  const three = await page.evaluate(() => ({ renders: window.__threeRenders || 0, objects: window.__threeObjects || 0 }));
  check("3D scene builds and animates (cartoon planets, moon, astronaut, UFO)", three.renders > 5 && three.objects > 80, JSON.stringify(three));
  check("background cast present (UFO, alien, satellite, comets)", (await page.locator(".bd-ufo, .bd-alien, .bd-satellite, .comet").count()) >= 4);
  check("background cast never blocks clicks", await page.evaluate(() => getComputedStyle(document.querySelector(".cosmic-backdrop")).pointerEvents === "none"));
  check("Planet Smash card on home page", (await page.locator(".home-smash-card").count()) === 1);

  // ---- sing-along songs
  await page.getByRole("button", { name: /Open music controls/ }).click();
  check("music center has a sing-along section with 6 songs", (await page.locator(".music-cat").nth(1).locator(".music-theme-card").count()) === 6);
  await page.getByRole("button", { name: "Select Twinkle Twinkle Little Star" }).click();
  await page.waitForTimeout(1200);
  const snd = await page.evaluate(() => JSON.parse(localStorage.getItem("paradox_sound_v2") || "{}"));
  check("Twinkle Twinkle Little Star selected and remembered", snd.theme === "twinkle");
  check("now-playing shows the song", (await page.locator(".mc-title").innerText()).includes("Twinkle"));
  for (const song of ["Mary Had a Little Lamb", "Row, Row, Row Your Boat", "Frère Jacques", "Old MacDonald Had a Farm", "London Bridge Is Falling Down"]) {
    await page.getByRole("button", { name: `Select ${song}` }).click();
    await page.waitForTimeout(250);
  }
  check("every song plays without errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.screenshot({ path: `${SHOTS}/f1-songs.png` });
  await page.keyboard.press("Escape");

  // ---- Planet Smash
  await page.goto(BASE + "/planet-smash");
  await page.waitForSelector(".smash-canvas");
  await page.waitForTimeout(1500); // page settles and auto-scrolls the stage into view
  const box = await page.locator(".smash-canvas").boundingBox();
  check("whole play area (launch pad included) is visible on a laptop screen", box.y >= 0 && box.y + box.height <= 860 + 1, JSON.stringify({ top: Math.round(box.y), bottom: Math.round(box.y + box.height) }));
  let score = 0;
  for (let i = 0; i < 14 && score < 30; i++) {
    const target = await page.evaluate(() => { const g = window.__paradoxSmash; const p = g.planets.find((q) => q.state === "ok"); return p ? { x: p.x + p.vx * 18, y: p.y + p.vy * 18 } : null; });
    if (!target) { await page.waitForTimeout(400); continue; }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 60);
    await page.mouse.down();
    await page.mouse.move(box.x + target.x, box.y + target.y, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(700);
    score = Number(await page.locator(".smash-stat b").first().innerText());
  }
  check("drag-to-launch smashes planets and scores points", score > 0, `score ${score}`);
  const state = await page.evaluate(() => { const g = window.__paradoxSmash; return { smashed: g.planets.filter((p) => p.state !== "ok").length, particles: g.particles.length }; });
  check("explosion confetti / states appear", state.smashed > 0 || state.particles > 0, JSON.stringify(state));
  const grr = await page.locator(".smash-grr em").evaluate((el) => parseFloat(el.style.width));
  check("Grr-o-meter goes down as planets are smashed", grr < 100, `${grr}%`);
  await page.screenshot({ path: `${SHOTS}/f2-smash.png` });
  await page.waitForFunction(() => window.__paradoxSmash.planets.every((pl) => pl.state === "ok"), null, { timeout: 15000 }).catch(() => {});
  const reformed = await page.evaluate(() => window.__paradoxSmash.planets.every((p) => p.state === "ok" || p.state === "dizzy" || p.state === "reform"));
  check("smashed planets bounce back together", reformed);
  // keyboard play
  await page.locator(".smash-canvas").focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Space");
  await page.waitForTimeout(80);
  check("keyboard: arrows aim, Space launches", await page.evaluate(() => window.__paradoxSmash.rockets.length >= 1));
  await page.getByRole("radio", { name: /Rainbow/ }).click();
  check("rocket style can be changed", (await page.getByRole("radio", { name: /Rainbow/ }).getAttribute("aria-checked")) === "true");
  await page.getByRole("button", { name: /Calm corner/ }).click();
  check("Calm corner breathing break opens", await page.locator(".calm-bubble").isVisible());
  await page.screenshot({ path: `${SHOTS}/f3-calm.png` });
  await page.getByRole("button", { name: /I feel better/ }).click();
  check("Calm corner closes back to the game", (await page.locator(".calm-backdrop").count()) === 0);
  check("Planet Smash in the More menu", await (async () => { await page.getByRole("button", { name: /More/ }).click(); const n = await page.getByRole("menuitem", { name: /Planet Smash/ }).count(); await page.keyboard.press("Escape"); return n === 1; })());

  // ---- Space Energy bar + Smash Break (pick a specific planet)
  await page.goto(BASE + "/account");
  await page.waitForSelector(".energy-bar");
  check("Space Energy bar shows in the navbar", (await page.locator(".energy-bar").innerText()).includes("%"));
  const e0 = await page.evaluate(() => JSON.parse(localStorage.getItem("paradox_space_energy_v1") || '{"value":100}').value);
  await page.goto(BASE + "/mission/1?scenario=1&difficulty=Easy&autostart=1");
  await page.waitForSelector(".mp-question");
  await page.locator(".mp-question .mp-option").first().click();
  await page.getByRole("button", { name: /Check answer/ }).click();
  await page.waitForSelector(".mp-feedback");
  await page.waitForTimeout(300);
  const e1 = await page.evaluate(() => JSON.parse(localStorage.getItem("paradox_space_energy_v1")).value);
  check("answering mission questions uses up energy", e1 < e0, `${e0} -> ${e1}`);
  await page.evaluate(() => localStorage.setItem("paradox_space_energy_v1", JSON.stringify({ value: 12, day: new Date().toDateString(), prompted: false })));
  await page.goto(BASE + "/account");
  await page.waitForSelector(".smash-break", { timeout: 6000 });
  check("when energy is exhausted, a Smash Break pops up", (await page.locator("#smash-break-title").innerText()).includes("running low"));
  check("child can pick from 11 planets (+ All)", (await page.locator(".sb-planet").count()) === 12);
  const sbBox = await page.locator(".smash-break").boundingBox();
  check("Smash Break card is fully visible on screen (not clipped)", sbBox.y >= 0 && sbBox.height > 300 && sbBox.y + sbBox.height <= 860 + 1, JSON.stringify({ y: Math.round(sbBox.y), h: Math.round(sbBox.height) }));
  await page.screenshot({ path: `${SHOTS}/f5-smash-break.png` });
  await page.getByRole("listitem", { name: "Crash Mars" }).click();
  await page.waitForURL(/planet-smash\?target=Mars/);
  await page.waitForTimeout(1500);
  const mars = await page.evaluate(() => window.__paradoxSmash.planets.map((p) => p.name));
  check("the chosen planet (Mars) is the big target", mars.length === 1 && mars[0] === "Mars", mars.join(","));
  check("Mars is selected in the target chooser", (await page.getByRole("radio", { name: /Mars/ }).getAttribute("aria-checked")) === "true");
  const sbox = await page.locator(".smash-canvas").boundingBox();
  let hits = 0;
  for (let i = 0; i < 12 && hits === 0; i++) {
    const t = await page.evaluate(() => { const p = window.__paradoxSmash.planets[0]; return { x: p.x + p.vx * 16, y: p.y + p.vy * 16, state: p.state }; });
    await page.mouse.move(sbox.x + sbox.width / 2, sbox.y + sbox.height - 60); await page.mouse.down();
    await page.mouse.move(sbox.x + t.x, sbox.y + t.y, { steps: 3 }); await page.mouse.up();
    await page.waitForTimeout(900);
    hits = await page.evaluate(() => window.__paradoxSmash.smashes);
  }
  const e2 = await page.evaluate(() => JSON.parse(localStorage.getItem("paradox_space_energy_v1")).value);
  check("smashing the chosen planet recharges energy", hits > 0 && e2 > 12, `smashes ${hits}, energy ${e2}`);
  await page.screenshot({ path: `${SHOTS}/f6-mars.png` });
  await page.getByRole("radio", { name: /Saturn/ }).click();
  await page.waitForTimeout(300);
  check("switching target to Saturn swaps the planet", (await page.evaluate(() => window.__paradoxSmash.planets.map((p) => p.name).join(","))) === "Saturn");
  await page.getByRole("radio", { name: /^🌌 All|All$/ }).click();
  await page.waitForTimeout(300);
  check("'All' brings back many planets", (await page.evaluate(() => window.__paradoxSmash.planets.length)) >= 4);
  await page.locator(".energy-bar").click();
  check("tapping the energy bar opens the planet picker any time", await page.locator(".smash-break").isVisible());
  await page.getByRole("button", { name: /Not now|keep learning/ }).click();

  // ---- mobile
  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const token = await page.evaluate(() => localStorage.getItem("paradox_access_token"));
  await m.addInitScript((t) => { localStorage.setItem("paradox_access_token", t); localStorage.setItem("paradox_tutorial_seen", "1"); }, token);
  await m.goto(BASE + "/planet-smash");
  await m.waitForTimeout(1600);
  check("mobile Planet Smash: no horizontal overflow", (await m.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1);
  const mb = await m.locator(".smash-canvas").boundingBox();
  const tgt = await m.evaluate(() => { const p = window.__paradoxSmash.planets[0]; return { x: p.x, y: p.y }; });
  await m.touchscreen.tap(mb.x + tgt.x, mb.y + tgt.y);
  await m.waitForTimeout(80);
  check("mobile tap launches a rocket", await m.evaluate(() => window.__paradoxSmash.rockets.length >= 1));
  await m.screenshot({ path: `${SHOTS}/f4-mobile.png` });

  check("no console or page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error("E2E crashed:", e.message.split("\n")[0]); console.log(results.filter((r) => !r.ok)); process.exit(2); });
