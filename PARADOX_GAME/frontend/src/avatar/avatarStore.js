// Astronaut avatar choices live in the browser (per explorer). Items unlock as the explorer levels up.
export const SUITS = [
  { id: "sky", name: "Sky Blue", color: "#3b82f6", lvl: 1 },
  { id: "rocket", name: "Rocket Red", color: "#ef4444", lvl: 1 },
  { id: "mint", name: "Mint", color: "#10b981", lvl: 1 },
  { id: "sunny", name: "Sunny", color: "#f59e0b", lvl: 2 },
  { id: "bubble", name: "Bubblegum", color: "#ec4899", lvl: 3 },
  { id: "nebula", name: "Nebula", color: "#8b5cf6", lvl: 4 },
  { id: "gold", name: "Champion Gold", color: "#eab308", lvl: 6 },
];
export const BADGES = [
  { id: "rocket", icon: "🚀", name: "Rocket", lvl: 1 },
  { id: "star", icon: "⭐", name: "Star", lvl: 1 },
  { id: "moon", icon: "🌙", name: "Moon", lvl: 1 },
  { id: "planet", icon: "🪐", name: "Planet", lvl: 2 },
  { id: "comet", icon: "☄️", name: "Comet", lvl: 3 },
  { id: "ufo", icon: "🛸", name: "UFO", lvl: 4 },
  { id: "crown", icon: "👑", name: "Crown", lvl: 6 },
];
export const ROCKETS = [
  { id: "red", name: "Classic Red", color: "#ff5d7a", lvl: 1 },
  { id: "ocean", name: "Ocean", color: "#38bdf8", lvl: 1 },
  { id: "lime", name: "Lime Zoom", color: "#84cc16", lvl: 2 },
  { id: "gold", name: "Golden", color: "#fbbf24", lvl: 3 },
  { id: "galaxy", name: "Galaxy", color: "#a78bfa", lvl: 5 },
];
export const DEFAULT_AVATAR = { suit: "sky", badge: "rocket", rocket: "red" };

export const AVATAR_EVENT = "paradox:avatar-changed";
const key = (userId) => `paradox_avatar_${userId}`;

export function loadAvatar(userId) {
  try { return { ...DEFAULT_AVATAR, ...JSON.parse(localStorage.getItem(key(userId)) || "{}") }; } catch { return { ...DEFAULT_AVATAR }; }
}
export function saveAvatar(userId, avatar) {
  try { localStorage.setItem(key(userId), JSON.stringify(avatar)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(AVATAR_EVENT, { detail: { userId } }));
}
export const find = (list, id) => list.find((x) => x.id === id) || list[0];
