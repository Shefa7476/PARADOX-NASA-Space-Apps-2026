// PARADOX end-to-end: question uniqueness, persistence, accounts, colours, AI evidence, layout.
// Usage (backend + frontend running):  node scripts/e2e-questions.cjs [screenshot-folder]
const { chromium } = require("playwright");
const fs = require("fs");
const BASE = process.env.PARADOX_URL || "http://localhost:5173";
const API = process.env.PARADOX_API || "http://127.0.0.1:8000";
const SHOTS = process.argv[2] || "e2e-screenshots";
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const check = (name, ok, info = "") => { results.push({ name, ok: !!ok, info }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${info ? " :: " + info : ""}`); };

async function register(tag) {
  const name = `${tag}_${Date.now().toString(36)}`;
  const r = await fetch(API + "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: name, email: `${name}@example.test`, display_name: tag, password: "rocket1234" }) });
  return { name, ok: r.ok };
}
async function login(page, name) {
  await page.goto(BASE + "/login");
  await page.locator("input").nth(0).fill(name);
  await page.locator('input[type="password"]').fill("rocket1234");
  await page.locator(".auth-submit").click();
  await page.waitForFunction(() => !!localStorage.getItem("paradox_access_token"));
}
async function logout(page) {
  await page.evaluate(() => { localStorage.removeItem("paradox_access_token"); localStorage.removeItem("paradox_cached_user"); });
}
/** Play one mission; returns {questions:[text], counts:[n options], exhausted, origins, review} */
async function dismissBreak(page) {
  // Low Space Energy opens a Smash Break; answer like a child who wants to keep learning.
  if (await page.locator(".smash-break").count()) await page.getByRole("button", { name: /keep learning|Not now/ }).click();
}
async function playMission(page, url, { mode = "first" } = {}) {
  await page.goto(BASE + url);
  await page.waitForSelector(".mp-question, .mp-exhausted", { timeout: 15000 });
  if (await page.locator(".mp-exhausted").count()) return { exhausted: true, questions: [] };
  const out = { questions: [], counts: [], origins: [], oneCorrect: true, review: !!(await page.locator(".mp-session-notice").count()) };
  for (let i = 0; i < 6; i++) {
    if (!(await page.locator(".mp-question").count())) break;
    await dismissBreak(page);
    out.questions.push(await page.locator(".mp-q-text").innerText());
    const opts = page.locator(".mp-question .mp-option");
    const n = await opts.count();
    out.counts.push(n);
    const labels = await opts.locator(".mp-label").allInnerTexts();
    out.origins.push(...(await page.locator(".mp-q-badges .mp-badge").allInnerTexts()));
    await opts.nth(mode === "first" ? 0 : n - 1).click();
    await page.getByRole("button", { name: /Check answer/ }).click();
    await page.waitForSelector(".mp-feedback");
    const correct = (await page.locator(".mp-fb-answer b").innerText()).trim();
    if (labels.filter((l) => l.trim() === correct).length !== 1) out.oneCorrect = false;
    await page.waitForTimeout(1600); // let any Smash Break prompt appear
    await dismissBreak(page);
    await page.locator(".mp-feedback .mp-btn.primary").click();
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(600);
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  await ctx.addInitScript(() => localStorage.setItem("paradox_tutorial_seen", "1"));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|503|409|WebGL|fonts\.g/i.test(m.text())) errors.push(m.text()); });

  const A = await register("Ava"); const B = await register("Ben");
  check("two student accounts registered", A.ok && B.ok);
  await login(page, A.name);

  // --- levels use different questions
  const easy = await playMission(page, "/mission/1?scenario=1&difficulty=Easy&autostart=1");
  const med = await playMission(page, "/mission/1?scenario=1&difficulty=Medium&autostart=1");
  const hard = await playMission(page, "/mission/1?scenario=1&difficulty=Hard&autostart=1");
  check("Easy questions have 3 options", easy.counts.length >= 3 && easy.counts.every((n) => n === 3), easy.counts.join(","));
  check("Medium/Hard questions have 4 options", [...med.counts, ...hard.counts].every((n) => n === 4));
  const overlap = (a, b) => a.filter((q) => b.includes(q));
  check("Easy, Medium and Hard share no questions", !overlap(easy.questions, med.questions).length && !overlap(med.questions, hard.questions).length && !overlap(easy.questions, hard.questions).length, JSON.stringify([...overlap(easy.questions, med.questions), ...overlap(med.questions, hard.questions), ...overlap(easy.questions, hard.questions)]));
  check("every question has exactly one correct option", [easy, med, hard].every((r) => r.oneCorrect));

  // --- replay, refresh, logout/login: no repeats
  const seen = new Set(easy.questions);
  const replay = await playMission(page, "/mission/1?scenario=1&difficulty=Easy&autostart=1");
  check("replaying the same mission gives new questions", replay.questions.length > 0 && !replay.questions.some((q) => seen.has(q)), replay.questions.map((q) => q.slice(0, 30)).join(" | "));
  replay.questions.forEach((q) => seen.add(q));
  await page.reload();
  const afterRefresh = await playMission(page, "/mission/1?scenario=1&difficulty=Easy&autostart=1");
  check("after browser refresh: still no repeats", afterRefresh.exhausted || !afterRefresh.questions.some((q) => seen.has(q)));
  afterRefresh.questions.forEach((q) => seen.add(q));
  await logout(page);
  await login(page, A.name);
  let last = await playMission(page, "/mission/1?scenario=1&difficulty=Easy&autostart=1");
  check("after logout + login: history kept, no repeats", last.exhausted || !last.questions.some((q) => seen.has(q)));
  check("NASA-data questions appear in rotation", [replay, afterRefresh, last].some((r) => (r.origins || []).some((o) => /NASA data/.test(o))));
  let plays = 0;
  while (!last.exhausted && plays < 8) { last.questions.forEach((q) => seen.add(q)); last = await playMission(page, "/mission/1?scenario=1&difficulty=Easy&autostart=1"); if (!last.exhausted) check(`extra replay ${plays + 1} has only unseen questions`, !last.questions.some((q) => seen.has(q))); plays++; }
  check("when new questions run out, an explicit message appears (no silent repeats)", last.exhausted && (await page.locator(".mp-exhausted").innerText()).includes("every new"));
  await page.screenshot({ path: `${SHOTS}/q1-exhausted.png` });
  await page.getByRole("button", { name: /Review mission/ }).click();
  await page.waitForSelector(".mp-session-notice");
  check("review mode is clearly labelled", (await page.locator(".mp-session-notice").innerText()).includes("Review mission"));
  check("level picker shows how many new questions remain", (await page.locator(".d-count").count()) === 3, (await page.locator(".d-count").allInnerTexts()).join(","));

  // --- second student has independent history
  await logout(page);
  await login(page, B.name);
  const ben = await playMission(page, "/mission/1?scenario=1&difficulty=Easy&autostart=1");
  check("a different student starts fresh (independent history)", ben.questions.length === 4 && !ben.exhausted);

  // --- colour mapping
  await page.evaluate(() => localStorage.setItem("paradox_space_energy_v1", JSON.stringify({ value: 100, day: new Date().toDateString(), prompted: false })));
  await page.goto(BASE + "/mission/1?scenario=2&difficulty=Easy");
  await page.waitForSelector(".mp-setup [role=radio]");
  const colours = {};
  for (const lvl of ["Easy", "Medium", "Hard"]) {
    await page.getByRole("radio", { name: new RegExp(lvl) }).click();
    await page.waitForTimeout(1000);
    colours[lvl] = await page.getByRole("radio", { name: new RegExp(lvl) }).evaluate((el) => getComputedStyle(el).borderTopColor);
  }
  check("Easy = emerald", colours.Easy === "rgb(52, 211, 153)", colours.Easy);
  check("Medium = amber", colours.Medium === "rgb(251, 191, 36)", colours.Medium);
  check("Hard = coral", colours.Hard === "rgb(255, 138, 115)", colours.Hard);
  const labelsWithIcons = await page.locator(".difficulty-option .d-icon").count();
  check("difficulty colours are paired with icons + labels", labelsWithIcons === 3);

  // --- correct / incorrect feedback distinguishable without colour
  await page.getByRole("button", { name: /Start Hard mission/ }).click();
  await page.waitForSelector(".mp-question");
  await page.locator(".mp-question .mp-option").first().click();
  await page.getByRole("button", { name: /Check answer/ }).click();
  await page.waitForSelector(".mp-feedback");
  const fbText = await page.locator(".mp-fb-head b").innerText();
  check("feedback uses words + icons, not only colour", /Brilliant|Spot on|Stellar|got it|Good try/.test(fbText) && (await page.locator(".mp-dot.right, .mp-dot.wrong").first().innerText()).match(/[✓✕]/));
  await page.screenshot({ path: `${SHOTS}/q2-feedback.png` });

  // --- clickability: nothing covers visible buttons
  const blocked = await page.evaluate(() => [...document.querySelectorAll(".mission-play button")].filter((b) => {
    const r = b.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) return false;
    const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return el && !b.contains(el) && !el.closest(".zippy, .music-center, .ask-ai-fab, .game-hud");
  }).map((b) => b.innerText.slice(0, 20)));
  check("all visible mission buttons are clickable (not covered)", blocked.length === 0, blocked.join(","));

  // --- AI: knowledge beyond the quiz bank, citations, markdown, actions, failure
  await page.locator(".mp-ai-card .mp-btn").click();
  await page.waitForSelector(".ai-chat");
  await page.locator(".ai-input textarea").fill("How do black holes form?");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".ai-msg.from-ai .ai-sources", { timeout: 8000 });
  check("AI answers beyond the quiz bank with cited sources", (await page.locator(".ai-msg.from-ai .md-cite").count()) >= 1 && (await page.locator(".ai-sources li").count()) >= 1);
  check("sources link to real reference sites", (await page.locator(".ai-sources a").first().getAttribute("href")).startsWith("https://"));
  for (const label of ["Explain more", "Give example", "Explain in Bangla", "Explain simply", "Related questions"]) check(`chat action "${label}" available`, (await page.getByRole("button", { name: label }).count()) === 1);
  await page.getByRole("button", { name: "Related questions" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".ai-msg.from-ai").length >= 2 && !document.querySelector(".ai-typing"));
  check("Related questions render as a formatted list", (await page.locator(".ai-msg.from-ai .md ol li").count()) >= 2);
  await page.locator(".ai-input textarea").fill("Can it eat the Earth?");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelectorAll(".ai-msg.from-ai").length >= 3 && !document.querySelector(".ai-typing"));
  check("follow-up with 'it' stays on topic", /black hole|gravity|mass/i.test(await page.locator(".ai-msg.from-ai .md").last().innerText()));
  await page.screenshot({ path: `${SHOTS}/q3-chat.png` });
  await page.route("**/api/tutor/chat", (route) => route.abort());
  await page.locator(".ai-input textarea").fill("What is a comet?");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".ai-error");
  check("network failure shows a friendly error with Try again", (await page.locator(".ai-error").innerText()).includes("Try again"));
  await page.unroute("**/api/tutor/chat");
  await page.getByRole("button", { name: /Try again/ }).click();
  await page.waitForFunction(() => document.querySelectorAll(".ai-msg.from-ai").length >= 4 && !document.querySelector(".ai-typing"), null, { timeout: 8000 });
  check("retry after failure succeeds", true);
  const longOk = await page.evaluate(() => { const c = document.querySelector(".ai-chat"); return c.scrollWidth <= c.clientWidth + 1; });
  check("long AI answers don't overflow the chat panel", longOk);
  await page.getByRole("button", { name: "Close chat" }).click();

  // --- insights + typography
  await page.goto(BASE + "/account");
  await page.waitForSelector(".insights-grid");
  check("learning insights panel shows accuracy by level", (await page.locator(".insight-bar").count()) === 3);
  await page.screenshot({ path: `${SHOTS}/q4-dashboard.png`, fullPage: true });
  const h1Sizes = {};
  for (const path of ["/account", "/missions", "/space-academy", "/time-attack", "/mission/2?scenario=1&difficulty=Easy", "/settings", "/parent", "/profile"]) {
    await page.goto(BASE + path); await page.waitForTimeout(900);
    h1Sizes[path] = await page.evaluate(() => { const h = document.querySelector(".app-content h1:not(.home-title)"); return h ? parseFloat(getComputedStyle(h).fontSize) : null; });
    await page.screenshot({ path: `${SHOTS}/page${path.replace(/[/?=&]/g, "_")}.png` });
  }
  const sizes = Object.values(h1Sizes).filter(Boolean);
  check("page headings use one consistent scale (≤ 36px)", sizes.every((s) => s <= 36.5 && s >= 24), JSON.stringify(h1Sizes));

  // --- mobile
  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const token = await page.evaluate(() => localStorage.getItem("paradox_access_token"));
  await m.addInitScript((t) => { localStorage.setItem("paradox_access_token", t); localStorage.setItem("paradox_tutorial_seen", "1"); }, token);
  for (const path of ["/account", "/mission/2?scenario=1&difficulty=Medium&autostart=1", "/space-academy", "/time-attack"]) {
    await m.goto(BASE + path); await m.waitForTimeout(1600);
    const over = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    check(`mobile ${path}: no horizontal overflow`, over <= 1, `${over}px`);
    await m.screenshot({ path: `${SHOTS}/m${path.replace(/[/?=&]/g, "_")}.png`, fullPage: true });
  }

  check("no console or page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  fs.writeFileSync(`${SHOTS}/e2e-questions-results.json`, JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error("E2E crashed:", e.message.split("\n")[0]); console.log(results.filter((r) => !r.ok)); process.exit(2); });
