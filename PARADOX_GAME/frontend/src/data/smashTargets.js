// Cartoon versions of real Solar System bodies a child can pick to crash in Planet Smash.
export const SMASH_TARGETS = [
  { id: "Mercury", emoji: "🪨", color: "#cbb3a0", dark: "#7d6556" },
  { id: "Venus", emoji: "🌕", color: "#f4d394", dark: "#c98b3c" },
  { id: "Earth", emoji: "🌍", color: "#60b8ff", dark: "#1f5fb8", land: true },
  { id: "Moon", emoji: "🌙", color: "#e5e7eb", dark: "#8f97a6", craters: true },
  { id: "Mars", emoji: "🔴", color: "#f08a66", dark: "#a8402a", craters: true },
  { id: "Jupiter", emoji: "🟠", color: "#f0c9a0", dark: "#b47b4f", stripes: "#c98c5e", spot: true },
  { id: "Saturn", emoji: "🪐", color: "#f3dfae", dark: "#c49a52", ring: true, stripes: "#d9b878" },
  { id: "Uranus", emoji: "🧊", color: "#a9ecec", dark: "#4aa7b0", ring: true, tilt: true },
  { id: "Neptune", emoji: "🔵", color: "#7f9cff", dark: "#3047c4", stripes: "#5a76e6" },
  { id: "Pluto", emoji: "🤍", color: "#e9d8cc", dark: "#9b8577", heart: true },
  { id: "Sun", emoji: "☀️", color: "#ffd54d", dark: "#f08a1c", sun: true },
];
export const targetById = (id) => SMASH_TARGETS.find((t) => t.id.toLowerCase() === String(id || "").toLowerCase()) || null;
