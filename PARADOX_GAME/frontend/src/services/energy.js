// Space Energy: a gentle "how tired am I?" bar for the child.
// It drains while they work through missions and answer questions, and
// recharges during breaks (Planet Smash, Calm corner) and while resting.
// Stored on this device only.
import { onFx } from "../audio/fxBus";

const KEY = "paradox_space_energy_v1";
export const ENERGY_EVENT = "paradox:energy";
export const LOW_ENERGY = 25;
const listeners = new Set();

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    // A new day starts with a full battery.
    if (v.day !== new Date().toDateString()) return { value: 100, day: new Date().toDateString(), prompted: false };
    return { value: Math.max(0, Math.min(100, Number(v.value ?? 100))), day: v.day, prompted: Boolean(v.prompted) };
  } catch { return { value: 100, day: new Date().toDateString(), prompted: false }; }
}
let state = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((fn) => fn({ ...state }));
  window.dispatchEvent(new CustomEvent(ENERGY_EVENT, { detail: { ...state } }));
}

export function getEnergy() { return { ...state }; }
export function subscribeEnergy(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function changeEnergy(delta) {
  const before = state.value;
  state.value = Math.max(0, Math.min(100, Math.round((state.value + delta) * 10) / 10));
  if (state.value > LOW_ENERGY + 15) state.prompted = false; // allow a new break prompt next time
  if (state.value !== before) save();
}
export function markPrompted() { state.prompted = true; save(); }
export function refillEnergy() { state.value = 100; state.prompted = false; save(); }

const COSTS = { correct: -3, wrong: -6, success: -5, fail: -6 };
let started = false;

/** Start listening to game moments and time. Safe to call more than once. */
export function startEnergyTracking() {
  if (started) return;
  started = true;
  onFx(({ type }) => { if (COSTS[type]) changeEnergy(COSTS[type]); });
  // Every minute: learning pages drain a little; play/rest pages recharge.
  window.setInterval(() => {
    if (document.hidden) return;
    const path = window.location.pathname;
    if (path.startsWith("/planet-smash")) changeEnergy(4);
    else if (/^\/(mission|time-attack|ai-lab|branching|solar-storm|advanced)/.test(path)) changeEnergy(-2);
    else changeEnergy(1);
  }, 60000);
}
