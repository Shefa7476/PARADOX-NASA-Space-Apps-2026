const KEY = "paradox_accessibility_preferences";
export function loadPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { ageMode: stored.ageMode || localStorage.getItem("paradox_age_mode") || "9-12", fontSize: stored.fontSize || "normal", motion: stored.motion || "full", graphics: stored.graphics || "auto", theme: stored.theme || "space", voice: stored.voice || "on", festival: stored.festival || "none" };
  } catch { return { ageMode: "9-12", fontSize: "normal", motion: "full", graphics: "auto", theme: "space", voice: "on", festival: "none" }; }
}
export function savePreferences(value) { localStorage.setItem(KEY, JSON.stringify(value)); localStorage.setItem("paradox_age_mode", value.ageMode); window.dispatchEvent(new Event("paradox:preferences-updated")); }
export function applyPreferences(value = loadPreferences()) {
  const root = document.documentElement;
  root.dataset.motion = value.motion;
  root.dataset.graphics = value.graphics;
  root.dataset.theme = value.theme;
  root.dataset.fontSize = value.fontSize;
  root.dataset.festival = value.festival || "none";
}
