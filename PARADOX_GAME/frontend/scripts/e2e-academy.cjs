// PARADOX end-to-end click-through (difficulty, questions, AI chat, music, dashboard, mobile).
// Usage (backend + frontend running):  npm i -D playwright && npx playwright install chromium
//   node scripts/e2e-academy.cjs [screenshot-folder]
const { chromium } = require("playwright");
const fs = require("fs");
const BASE = process.env.PARADOX_URL || "http://localhost:5173";
const API = process.env.PARADOX_API || "http://127.0.0.1:8000";
const SHOTS = process.argv[2] || "e2e-screenshots";
fs.mkdirSync(SHOTS, { recursive: true });
const NAME = "e2e_" + Date.now().toString(36);
const results = [];
const check = (name, ok, info = "") => { results.push({ name, ok: !!ok, info }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${info ? " :: " + info : ""}`); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|503|WebGL|fonts\.g/i.test(m.text())) errors.push("console: " + m.text()); });
  await page.addInitScript(() => { localStorage.setItem("paradox_tutorial_seen", "1"); localStorage.removeItem("paradox_tutorial_pending"); });

  // ---- create a throwaway test explorer, then log in through the UI
  const reg = await fetch(API + "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: NAME, email: NAME + "@example.test", display_name: "E2E Explorer", password: "rocket1234" }) });
  check("test account registered", reg.ok, String(reg.status));
  await page.goto(BASE + "/login");
  
  const inputs = page.locator("input");
  await inputs.nth(0).fill(NAME);
  await page.locator('input[type="password"]').fill("rocket1234");
  await page.locator('.auth-submit').click();
  await page.waitForTimeout(1200);
  check("login succeeds", await page.evaluate(() => !!localStorage.getItem("paradox_access_token")));

  // ---- navbar
  await page.goto(BASE + "/");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/01-home.png` });
  const navFont = await page.locator(".nav-link").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  check("navbar text is compact (13px)", navFont <= 13.5 && navFont >= 12, `${navFont}px`);
  check("navbar shows 4 primary links", (await page.locator(".nav-links > a.nav-link").count()) === 4);
  await page.getByRole("button", { name: /More/ }).click();
  check("More menu lists Parent Zone + Settings", (await page.getByRole("menuitem", { name: /Parent Zone/ }).count()) === 1 && (await page.getByRole("menuitem", { name: /Settings/ }).count()) === 1);
  await page.keyboard.press("Escape");

  // ---- planet modal difficulty
  await page.goto(BASE + "/missions");
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /Explore Mercury/ }).click({ force: true });
  await page.waitForTimeout(500);
  const radios = page.locator(".mission-modal [role=radio]");
  check("planet modal shows 3 difficulty options", (await radios.count()) === 3);
  // Nothing covers the buttons: the element at each button's centre is the button itself.
  const unblocked = await page.evaluate(() => [...document.querySelectorAll(".mission-modal [role=radio]")].every((b) => { const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return el && b.contains(el); }));
  check("modal difficulty buttons are not covered by overlays", unblocked);
  await page.getByRole("radio", { name: /Hard/ }).click();
  check("mouse: Hard becomes selected", (await page.getByRole("radio", { name: /Hard/ }).getAttribute("aria-checked")) === "true");
  await page.getByRole("radio", { name: /Hard/ }).focus();
  await page.keyboard.press("ArrowLeft");
  check("keyboard: ArrowLeft moves to Medium", (await page.getByRole("radio", { name: /Medium/ }).getAttribute("aria-checked")) === "true");
  await page.screenshot({ path: `${SHOTS}/02-planet-modal.png` });
  await page.locator(".scenario-launch-row").first().click();
  await page.waitForURL(/\/mission\/1/, { timeout: 9000 });
  await page.waitForSelector(".mp-question", { timeout: 6000 });
  check("launch carries Medium to the mission", /difficulty=Medium/.test(page.url()), page.url());
  check("Medium mission shows 4 answer options", (await page.locator(".mp-question .mp-option").count()) === 4);

  // ---- mission page: difficulty clickable after autostart (the original bug)
  const mpUnblocked = await page.evaluate(() => [...document.querySelectorAll(".mp-setup [role=radio]")].every((b) => !b.disabled && (() => { const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return el && b.contains(el); })()));
  check("mission page difficulty buttons enabled & unblocked after autostart", mpUnblocked);
  const firstQ = await page.locator(".mp-q-text").innerText();
  await page.getByRole("radio", { name: /Easy/ }).click();
  await page.waitForTimeout(900);
  check("switching to Easy at step 0 restarts with 3 options", (await page.locator(".mp-question .mp-option").count()) === 3);
  check("Easy chip/URL updated", /difficulty=Easy/.test(page.url()) && (await page.locator(".level-chip").innerText()).includes("Easy"));

  // answer one, then try to change level mid-mission -> confirm
  await page.keyboard.press("1");
  check("keyboard 1 selects option A", (await page.locator(".mp-option.picked").count()) === 1);
  await page.getByRole("button", { name: /Check answer/ }).click();
  await page.waitForSelector(".mp-feedback");
  check("feedback shows correct answer + explanation", (await page.locator(".mp-fb-answer").count()) === 1 && (await page.locator(".mp-fb-expl").innerText()).length > 20);
  await page.waitForTimeout(700); await page.locator(".mp-feedback").scrollIntoViewIfNeeded(); await page.screenshot({ path: `${SHOTS}/03-feedback.png` });
  await page.getByRole("radio", { name: /Hard/ }).click();
  check("mid-mission change asks for confirmation", await page.locator(".mp-confirm").isVisible());
  await page.getByRole("button", { name: /Restart now/ }).click();
  await page.waitForTimeout(900);
  check("restart at Hard gives 4 options at question 1", (await page.locator(".mp-question .mp-option").count()) === 4 && (await page.locator(".mp-q-count").innerText()).includes("Question 1"));
  const hardQ = await page.locator(".mp-q-text").innerText();

  // play through the whole Hard mission
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    if (!(await page.locator(".mp-question").count())) break;
    seen.add(await page.locator(".mp-q-text").innerText());
    await page.locator(".mp-question .mp-option").nth(i % 4).click();
    await page.getByRole("button", { name: /Check answer/ }).click();
    await page.waitForSelector(".mp-feedback");
    await page.locator(".mp-feedback .mp-btn.primary").click();
    await page.waitForTimeout(350);
  }
  check("Hard mission had 4 distinct questions", seen.size === 4, [...seen].map((s) => s.slice(0, 40)).join(" | "));
  await page.waitForTimeout(900);
  check("mission completion overlay appears", await page.locator(".mission-outcome-backdrop").isVisible());
  await page.screenshot({ path: `${SHOTS}/04-outcome.png` });
  await page.getByRole("button", { name: /Review my answers/ }).click();
  check("review lists all 4 answers", (await page.locator(".mp-review li").count()) === 4);
  await page.screenshot({ path: `${SHOTS}/05-review.png`, fullPage: true });
  if (await page.getByRole("button", { name: /Practise missed/ }).count()) {
    await page.getByRole("button", { name: /Practise missed/ }).click();
    await page.locator(".mp-practice .mp-option").first().click();
    check("practice mode checks answers", (await page.locator(".mp-practice .mp-fb-expl").count()) === 1);
  }

  // ---- different stage -> different questions
  await page.goto(BASE + "/mission/1?scenario=2&difficulty=Hard&autostart=1");
  await page.waitForSelector(".mp-question");
  check("stage 2 opens with stage-specific questions", (await page.locator(".mp-q-text").innerText()) !== hardQ);

  // ---- AI chat
  await page.locator(".mp-ai-card .mp-btn").click();
  await page.waitForSelector(".ai-chat");
  check("Ask AI opens chat with mission context", (await page.locator(".ai-context-chip").innerText()).includes("Mercury"));
  await page.locator(".ai-input textarea").fill("Why is Mars red?");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".ai-msg.from-ai .ai-provider", { timeout: 8000 });
  const reply = await page.locator(".ai-msg.from-ai .ai-bubble p").last().innerText();
  check("tutor replies with a labelled answer", reply.length > 10 && (await page.locator(".ai-provider.offline, .ai-provider.ai").count()) >= 1, reply.slice(0, 80));
  await page.getByRole("button", { name: /Explain simply/ }).click();
  await page.waitForTimeout(800);
  check("Explain again sends follow-up", (await page.locator(".ai-msg.from-user").count()) === 2);
  check("suggested follow-ups shown", (await page.locator(".ai-quick .suggest").count()) >= 2);
  await page.locator(".ai-input textarea").fill("my email is kid@example.com");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  check("personal info triggers safety reply", (await page.locator(".ai-provider.safety").count()) === 1);
  await page.getByRole("button", { name: "বাংলা" }).click();
  check("Bangla toggle switches labels", (await page.locator(".ai-input textarea").getAttribute("placeholder")).includes("জিপি"));
  await page.screenshot({ path: `${SHOTS}/06-chat.png` });
  await page.getByRole("button", { name: /চ্যাট মুছুন|Clear chat/ }).click();
  check("Clear chat empties conversation", (await page.locator(".ai-msg.from-user").count()) === 0);
  await page.getByRole("button", { name: "Close chat" }).click();

  // ---- music center
  await page.getByRole("button", { name: /Open music controls/ }).click();
  check("music center lists 6 space themes + 6 sing-along songs", (await page.locator(".music-theme-card").count()) === 12);
  await page.getByRole("button", { name: "Select Epic Mission" }).click();
  const sound = await page.evaluate(() => JSON.parse(localStorage.getItem("paradox_sound_v2") || "{}"));
  check("selected theme is remembered", sound.theme === "epic");
  await page.locator('input[aria-label="Music volume"]').fill("30");
  await page.locator('input[aria-label="Sound effects volume"]').fill("80");
  const sound2 = await page.evaluate(() => JSON.parse(localStorage.getItem("paradox_sound_v2") || "{}"));
  check("separate music/sfx volumes saved", Math.abs(sound2.musicVolume - 0.3) < 0.01 && Math.abs(sound2.sfxVolume - 0.8) < 0.01);
  await page.getByRole("button", { name: "Next music theme" }).click();
  check("next track advances theme", JSON.parse(await page.evaluate(() => localStorage.getItem("paradox_sound_v2"))).theme === "focus");
  await page.getByRole("button", { name: "Previous music theme" }).click();
  await page.getByRole("button", { name: /Preview Happy Space Kids/ }).click();
  check("preview marks theme as previewing", (await page.locator(".music-theme-card.previewing").count()) === 1);
  await page.screenshot({ path: `${SHOTS}/07-music.png` });
  await page.locator(".music-toggles .mute-all").click();
  check("Mute all toggles", (await page.locator(".music-toggles .mute-all").getAttribute("aria-pressed")) === "true");
  await page.locator(".music-toggles .mute-all").click();
  const ac = await page.evaluate(() => { const AC = window.AudioContext; return !!AC; });
  check("Web Audio available for music", ac);
  // navigation does not restart the music engine (module-level track survives route change)
  await page.keyboard.press("Escape");
  await page.waitForTimeout(9500); // let the 9 s preview finish and return to the selected theme
  await page.locator(".nav-links a", { hasText: "Dashboard" }).click();
  await page.waitForTimeout(1200);
  check("music theme persists across navigation", (await page.locator(".mc-title").innerText()).includes("Epic"));

  // ---- dashboard
  check("dashboard: floating XP bar not duplicated", (await page.locator(".game-hud").count()) === 0);
  check("dashboard: next-mission card", await page.locator(".dash-next-card").isVisible());
  check("dashboard: old repeated action bar removed", (await page.locator(".account-primary").count()) === 0);
  await page.screenshot({ path: `${SHOTS}/08-dashboard.png`, fullPage: true });

  // ---- responsive checks
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.addInitScript(() => { localStorage.setItem("paradox_tutorial_seen", "1"); });
  const token = await page.evaluate(() => localStorage.getItem("paradox_access_token"));
  const userJson = await page.evaluate(() => localStorage.getItem("paradox_cached_user"));
  await mobile.addInitScript(([t, u]) => { localStorage.setItem("paradox_access_token", t); if (u) localStorage.setItem("paradox_cached_user", u); }, [token, userJson]);
  const m = await mobile.newPage();
  m.on("pageerror", (e) => errors.push("mobile pageerror: " + e.message));
  for (const [path, name] of [["/", "home"], ["/account", "dashboard"], ["/mission/1?scenario=1&difficulty=Medium&autostart=1", "mission"], ["/missions", "missions"]]) {
    await m.goto(BASE + path);
    await m.waitForTimeout(1500);
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`mobile ${name}: no horizontal scroll`, overflow <= 1, `overflow ${overflow}px`);
    await m.screenshot({ path: `${SHOTS}/m-${name}.png`, fullPage: name !== "missions" });
  }
  await m.goto(BASE + "/mission/1?scenario=1&difficulty=Medium&autostart=1");
  await m.waitForSelector(".mp-question");
  await m.getByRole("radio", { name: /Hard/ }).tap();
  await m.waitForTimeout(900);
  check("mobile tap: Hard difficulty works", (await m.getByRole("radio", { name: /Hard/ }).getAttribute("aria-checked")) === "true");
  await m.getByRole("button", { name: /Toggle navigation menu/ }).tap();
  check("mobile nav drawer opens", await m.locator(".nav-drawer").isVisible());
  await m.screenshot({ path: `${SHOTS}/m-nav.png` });
  await m.getByRole("button", { name: /Toggle navigation menu/ }).tap();
  await m.locator(".ask-ai-fab").tap();
  check("mobile chat fits screen", await m.evaluate(() => { const r = document.querySelector(".ai-chat").getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth && r.top >= 0; }));
  await m.screenshot({ path: `${SHOTS}/m-chat.png` });

  // ---- reduced motion
  const rm = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  const r = await rm.newPage();
  await r.goto(BASE + "/");
  await r.waitForTimeout(600);
  check("reduced motion hides shooting stars", await r.evaluate(() => getComputedStyle(document.querySelector(".shooting-star")).display === "none"));

  check("no console/page errors", errors.length === 0, errors.slice(0, 5).join(" || "));
  await browser.close();
  const failed = results.filter((x) => !x.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  fs.writeFileSync(`${SHOTS}/e2e-results.json`, JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error("E2E crashed:", e.message.split("\n")[0]); console.log(results.map(r=>(r.ok?"ok ":"XX ")+r.name).join("\n")); console.log(results.filter((x) => !x.ok)); process.exit(2); });
