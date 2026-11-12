const frontend = process.env.PARADOX_FRONTEND_URL || "http://127.0.0.1:5173";
const backend = process.env.PARADOX_BACKEND_URL || "http://127.0.0.1:8000";
const checks = [
  ["Frontend app shell", `${frontend}/`],
  ["PWA manifest", `${frontend}/manifest.webmanifest`],
  ["Service worker", `${frontend}/sw.js`],
  ["PWA icon 192", `${frontend}/pwa-icon-192.png`],
  ["PWA icon 512", `${frontend}/pwa-icon-512.png`],
  ["Backend health", `${backend}/`],
  ["Game metadata", `${backend}/api/game`],
];
let failed = 0;
for (const [label, url] of checks) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log(`PASS  ${label}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${label}: ${error.message}`);
  }
}
try {
  const response = await fetch(`${backend}/api/account/summary`, { signal: AbortSignal.timeout(5000) });
  if (response.status === 401) console.log("PASS  Protected account API rejects anonymous requests");
  else { failed += 1; console.error(`FAIL  Protected account API expected 401, received ${response.status}`); }
} catch (error) {
  failed += 1;
  console.error(`FAIL  Protected account API check: ${error.message}`);
}
console.log(`\n${checks.length + 1 - failed}/${checks.length + 1} smoke checks passed.`);
if (failed) process.exitCode = 1;
