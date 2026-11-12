// PARADOX sound engine. Every sound and every music theme is synthesised live
// with the Web Audio API: no audio files, no downloads, no broken URLs and no
// licences needed (all music is original, generated note-by-note here).
// UI layer only; it never touches game logic.

const KEY = "paradox_sound_v2";
const LEGACY_KEY = "paradox_sound_v1";
const defaults = { sfx: true, music: true, voice: false, muted: false, theme: "cosmic", musicVolume: 0.55, sfxVolume: 0.7 };

let settings = { ...defaults };
try {
  const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "{}");
  settings = { ...defaults, ...legacy, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
} catch { /* ignore */ }

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let track = null; // { id, gain, timer, nextBar, bar }
let previewTimer = null;
let previewingId = null;
let duckDepth = 0;
const listeners = new Set();

const N = (semi) => 440 * Math.pow(2, (semi - 9) / 12); // semitones from C4 -> Hz (C4 = 0)
const MUSIC_MAX = 0.32;
const SFX_MAX = 0.8;

// ---------------------------------------------------------------- themes
// Each theme is a small generative "score": chord progression, bar length,
// pad sound, melody/arpeggio pattern, bass and light percussion.
export const MUSIC_THEMES = [
  { id: "cosmic", name: "Cosmic Adventure", emoji: "🚀", mood: "Exciting exploration", colors: ["#22d3ee", "#6366f1"],
    bar: 2.4, chords: [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 7]], pad: "triangle", padVol: 0.09,
    arp: { steps: 8, oct: 12, type: "sine", vol: 0.075, skip: 0.1, len: 0.45 }, bass: { type: "triangle", vol: 0.22, pulse: 2 }, kick: 0.16, hat: 0.03 },
  { id: "mystery", name: "Galactic Mystery", emoji: "🌌", mood: "Mysterious & atmospheric", colors: ["#a78bfa", "#0f172a"],
    bar: 4.8, chords: [[-3, 0, 4], [-7, -3, 0], [-10, -7, -3], [-8, -4, -1]], pad: "sawtooth", padVol: 0.035, padFilter: 700,
    arp: { steps: 6, oct: 24, type: "sine", vol: 0.05, skip: 0.55, len: 1.6 }, bass: { type: "sine", vol: 0.26, pulse: 1 }, kick: 0, hat: 0 },
  { id: "happy", name: "Happy Space Kids", emoji: "🎈", mood: "Playful & cheerful", colors: ["#facc15", "#f472b6"],
    bar: 1.8, chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], pad: "sine", padVol: 0.06,
    arp: { steps: 8, oct: 12, type: "square", vol: 0.035, skip: 0.2, len: 0.16, pentatonic: true }, bass: { type: "triangle", vol: 0.2, pulse: 4 }, kick: 0.12, hat: 0.04 },
  { id: "relax", name: "Deep Space Relaxation", emoji: "🌙", mood: "Peaceful ambient", colors: ["#38bdf8", "#1e3a8a"],
    bar: 7, chords: [[0, 4, 7, 11, 14], [2, 6, 9, 14], [-3, 0, 4, 7, 11], [-1, 2, 7, 11]], pad: "sine", padVol: 0.08,
    arp: { steps: 4, oct: 24, type: "sine", vol: 0.04, skip: 0.5, len: 2.6 }, bass: { type: "sine", vol: 0.16, pulse: 1 }, kick: 0, hat: 0 },
  { id: "epic", name: "Epic Mission", emoji: "🛡️", mood: "Cinematic adventure", colors: ["#fb923c", "#dc2626"],
    bar: 2.8, chords: [[2, 5, 9], [-2, 2, 5], [5, 9, 12], [0, 4, 7]], pad: "sawtooth", padVol: 0.05, padFilter: 1400,
    arp: { steps: 8, oct: 12, type: "triangle", vol: 0.06, skip: 0, len: 0.3, rising: true }, bass: { type: "sawtooth", vol: 0.1, pulse: 4, filter: 380 }, kick: 0.24, hat: 0.02, timpani: true },
  { id: "focus", name: "Focus Mode", emoji: "📚", mood: "Gentle music for learning", colors: ["#34d399", "#0d9488"],
    bar: 5.2, chords: [[5, 9, 12, 16], [-3, 0, 4, 7], [2, 5, 9, 12], [7, 10, 12, 14]], pad: "sine", padVol: 0.055,
    arp: { steps: 4, oct: 12, type: "sine", vol: 0.045, skip: 0.3, len: 1.8 }, bass: { type: "sine", vol: 0.12, pulse: 1 }, kick: 0, hat: 0 },
  // ---- Sing-along songs: traditional nursery tunes (all public domain), played as a music box.
  // notes: [semitone from C4, beats]; null = rest.
  { id: "twinkle", category: "songs", name: "Twinkle Twinkle Little Star", emoji: "⭐", mood: "Classic sing-along", colors: ["#fde68a", "#818cf8"],
    song: { bpm: 100, notes: [[0,1],[0,1],[7,1],[7,1],[9,1],[9,1],[7,2],[5,1],[5,1],[4,1],[4,1],[2,1],[2,1],[0,2],
      [7,1],[7,1],[5,1],[5,1],[4,1],[4,1],[2,2],[7,1],[7,1],[5,1],[5,1],[4,1],[4,1],[2,2],
      [0,1],[0,1],[7,1],[7,1],[9,1],[9,1],[7,2],[5,1],[5,1],[4,1],[4,1],[2,1],[2,1],[0,2]] } },
  { id: "mary", category: "songs", name: "Mary Had a Little Lamb", emoji: "🐑", mood: "Bouncy sing-along", colors: ["#f9a8d4", "#fef3c7"],
    song: { bpm: 112, notes: [[4,1],[2,1],[0,1],[2,1],[4,1],[4,1],[4,2],[2,1],[2,1],[2,2],[4,1],[7,1],[7,2],
      [4,1],[2,1],[0,1],[2,1],[4,1],[4,1],[4,1],[4,1],[2,1],[2,1],[4,1],[2,1],[0,4]] } },
  { id: "rowboat", category: "songs", name: "Row, Row, Row Your Boat", emoji: "🚣", mood: "Gentle rowing round", colors: ["#7dd3fc", "#34d399"],
    song: { bpm: 104, notes: [[0,1.5],[0,1.5],[0,1],[2,0.5],[4,1.5],[4,1],[2,0.5],[4,1],[5,0.5],[7,3],
      [12,0.5],[12,0.5],[12,0.5],[7,0.5],[7,0.5],[7,0.5],[4,0.5],[4,0.5],[4,0.5],[0,0.5],[0,0.5],[0,0.5],
      [7,1],[5,0.5],[4,1],[2,0.5],[0,3]] } },
  { id: "jacques", category: "songs", name: "Frère Jacques", emoji: "🔔", mood: "Are you sleeping?", colors: ["#c4b5fd", "#f472b6"],
    song: { bpm: 120, notes: [[0,1],[2,1],[4,1],[0,1],[0,1],[2,1],[4,1],[0,1],[4,1],[5,1],[7,2],[4,1],[5,1],[7,2],
      [7,0.5],[9,0.5],[7,0.5],[5,0.5],[4,1],[0,1],[7,0.5],[9,0.5],[7,0.5],[5,0.5],[4,1],[0,1],[0,1],[-5,1],[0,2],[0,1],[-5,1],[0,2]] } },
  { id: "macdonald", category: "songs", name: "Old MacDonald Had a Farm", emoji: "🐮", mood: "E-I-E-I-O!", colors: ["#fb923c", "#a3e635"],
    song: { bpm: 126, notes: [[7,1],[7,1],[7,1],[2,1],[4,1],[4,1],[2,2],[11,1],[11,1],[9,1],[9,1],[7,3],[null,1],
      [2,1],[7,1],[7,1],[7,1],[2,1],[4,1],[4,1],[2,2],[11,1],[11,1],[9,1],[9,1],[7,3],[null,1]] } },
  { id: "london", category: "songs", name: "London Bridge Is Falling Down", emoji: "🌉", mood: "Marching sing-along", colors: ["#fca5a5", "#93c5fd"],
    song: { bpm: 116, notes: [[7,1.5],[9,0.5],[7,1],[5,1],[4,1],[5,1],[7,2],[2,1],[4,1],[5,2],[4,1],[5,1],[7,2],
      [7,1.5],[9,0.5],[7,1],[5,1],[4,1],[5,1],[7,2],[2,2],[7,2],[4,1],[0,3]] } },
];
const themeById = (id) => MUSIC_THEMES.find((t) => t.id === id) || MUSIC_THEMES[0];

// ---------------------------------------------------------------- settings
export function getSettings() { return { ...settings, previewing: previewingId, playing: Boolean(track) && settings.music && !settings.muted }; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  const snapshot = getSettings();
  listeners.forEach((fn) => fn(snapshot));
}

const musicLevel = () => (settings.music && !settings.muted ? settings.musicVolume * MUSIC_MAX : 0);
const sfxLevel = () => (settings.sfx && !settings.muted ? settings.sfxVolume * SFX_MAX : 0);

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = sfxLevel();
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = musicLevel();
  musicBus.connect(master);
  return ctx;
}

function applyLevels(smooth = 0.12) {
  if (!ctx) return;
  const t = ctx.currentTime;
  sfxBus.gain.setTargetAtTime(sfxLevel(), t, 0.03);
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setTargetAtTime(duckDepth > 0 ? musicLevel() * 0.18 : musicLevel(), t, smooth);
}

/** Call from any user gesture. Browsers only allow audio after one. */
export function unlock() {
  const c = ensure();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  if (settings.music && !settings.muted && !track) startTheme(previewingId || settings.theme);
}

export function setSetting(name, value) {
  settings[name] = value;
  if (name === "voice" && !value && "speechSynthesis" in window) window.speechSynthesis.cancel();
  if (name === "music" || name === "muted") {
    if (settings.music && !settings.muted) { ensure(); if (!track && ctx?.state === "running") startTheme(settings.theme); }
    else stopTheme();
  }
  applyLevels();
  save();
}

export function setVolume(kind, value) {
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  if (kind === "music") settings.musicVolume = v;
  if (kind === "sfx") settings.sfxVolume = v;
  applyLevels(0.05);
  save();
}

export function setMuteAll(muted) { setSetting("muted", Boolean(muted)); }
export function toggleMusic() { unlock(); setSetting("music", !settings.music); }

export function setTheme(id) {
  clearPreview();
  settings.theme = themeById(id).id;
  if (!settings.music) settings.music = true;
  if (settings.muted) settings.muted = false;
  unlock();
  if (ctx?.state === "running") startTheme(settings.theme);
  applyLevels();
  save();
}

function stepTheme(direction) {
  const index = MUSIC_THEMES.findIndex((t) => t.id === settings.theme);
  setTheme(MUSIC_THEMES[(index + direction + MUSIC_THEMES.length) % MUSIC_THEMES.length].id);
}
export const nextTheme = () => stepTheme(1);
export const prevTheme = () => stepTheme(-1);

function clearPreview() {
  if (previewTimer) window.clearTimeout(previewTimer);
  previewTimer = null;
  previewingId = null;
}

/** Play a theme for a few seconds, then return to the selected theme. */
export function previewTheme(id, seconds = 9) {
  clearPreview();
  ensure();
  unlock();
  if (!ctx) return;
  previewingId = themeById(id).id;
  startTheme(previewingId, true);
  if (musicLevel() === 0) musicBus.gain.setTargetAtTime(Math.max(0.12, settings.musicVolume * MUSIC_MAX), ctx.currentTime, 0.1);
  previewTimer = window.setTimeout(() => {
    clearPreview();
    if (settings.music && !settings.muted) startTheme(settings.theme); else stopTheme();
    applyLevels();
    save();
  }, seconds * 1000);
  save();
}

// ---------------------------------------------------------------- building blocks
function tone({ f = 440, t = 0, d = 0.2, type = "sine", v = 0.3, to = null, a = 0.005, bus = sfxBus, detune = 0, at = null }) {
  if (!ctx) return;
  const start = at ?? ctx.currentTime + t;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, start + d);
  o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(v, start + a);
  g.gain.exponentialRampToValueAtTime(0.0001, start + d);
  o.connect(g).connect(bus);
  o.start(start);
  o.stop(start + d + 0.05);
}

const noiseCache = {};
function noiseBuffer(d) {
  const key = Math.round(d * 10);
  if (noiseCache[key]) return noiseCache[key];
  const len = Math.floor(ctx.sampleRate * d);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseCache[key] = buf;
  return buf;
}

function noise({ t = 0, d = 0.4, v = 0.2, from = 400, to = 3000, q = 1.2, bus = sfxBus, at = null }) {
  if (!ctx) return;
  const start = at ?? ctx.currentTime + t;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(d);
  const filt = ctx.createBiquadFilter();
  filt.type = "bandpass";
  filt.Q.value = q;
  filt.frequency.setValueAtTime(from, start);
  filt.frequency.exponentialRampToValueAtTime(to, start + d);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(v, start + d * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, start + d);
  src.connect(filt).connect(g).connect(bus);
  src.start(start);
}

function bell(semi, t = 0, v = 0.25, d = 0.7) {
  const f = N(semi);
  tone({ f, t, d, type: "sine", v });
  tone({ f: f * 2.01, t, d: d * 0.6, type: "sine", v: v * 0.35 });
  tone({ f: f * 3.99, t, d: d * 0.3, type: "sine", v: v * 0.12 });
}

// ---------------------------------------------------------------- sound effects
const SOUNDS = {
  click() { tone({ f: 520, to: 880, d: 0.09, type: "triangle", v: 0.28 }); },
  hover() { tone({ f: 1100, d: 0.035, type: "sine", v: 0.05 }); },
  back() { tone({ f: 700, to: 420, d: 0.1, type: "triangle", v: 0.22 }); },
  pop() { tone({ f: 300, to: 900, d: 0.12, type: "sine", v: 0.3 }); noise({ d: 0.05, v: 0.06, from: 2000, to: 6000 }); },
  whoosh() { noise({ d: 0.55, v: 0.18, from: 300, to: 4200, q: 0.8 }); },
  star() { bell(24, 0, 0.18, 0.5); bell(28, 0.07, 0.15, 0.5); },
  correct() { bell(12, 0, 0.26, 0.6); bell(16, 0.09, 0.26, 0.6); bell(19, 0.18, 0.28, 0.9); bell(24, 0.3, 0.2, 1.0); },
  wrong() { // soft, friendly "boing": encouragement, not scolding
    tone({ f: 392, to: 262, d: 0.28, type: "triangle", v: 0.22 });
    tone({ f: 330, to: 247, d: 0.32, t: 0.14, type: "sine", v: 0.16 });
  },
  success() {
    [0, 4, 7, 12].forEach((s, i) => { tone({ f: N(s + 12), t: i * 0.13, d: 0.28, type: "square", v: 0.12 }); tone({ f: N(s + 24), t: i * 0.13, d: 0.28, type: "triangle", v: 0.16 }); });
    [0, 4, 7, 12, 16].forEach((s) => tone({ f: N(s + 12), t: 0.62, d: 1.4, type: "triangle", v: 0.13 }));
    [24, 28, 31, 36, 40, 43].forEach((s, i) => bell(s, 0.7 + i * 0.09, 0.12, 0.8));
    noise({ t: 0.6, d: 0.9, v: 0.07, from: 3000, to: 9000, q: 0.6 });
  },
  fail() { [7, 5, 2, 0].forEach((s, i) => tone({ f: N(s + 12), t: i * 0.2, d: 0.4, type: "triangle", v: 0.18 })); },
  levelup() {
    [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => { tone({ f: N(s + 12), t: i * 0.07, d: 0.25, type: "triangle", v: 0.2 }); });
    [28, 31, 36].forEach((s, i) => bell(s, 0.55 + i * 0.12, 0.2, 1.2));
  },
  achievement() { bell(19, 0, 0.25, 0.8); bell(26, 0.12, 0.25, 0.8); bell(31, 0.26, 0.28, 1.2); },
  mascot() { tone({ f: 600, to: 1200, d: 0.12, type: "square", v: 0.1 }); tone({ f: 900, to: 500, d: 0.12, t: 0.1, type: "square", v: 0.1 }); tone({ f: 700, to: 1400, d: 0.14, t: 0.2, type: "square", v: 0.08 }); },
  beep() { tone({ f: 880, d: 0.18, type: "square", v: 0.16 }); tone({ f: 440, d: 0.18, type: "sine", v: 0.12 }); },
  go() { tone({ f: 1320, d: 0.5, type: "square", v: 0.15 }); tone({ f: 660, d: 0.5, type: "triangle", v: 0.15 }); },
  launch() { noise({ d: 1.6, v: 0.25, from: 120, to: 1800, q: 0.5 }); tone({ f: 70, to: 220, d: 1.6, type: "sawtooth", v: 0.12 }); },
  boom() { // big friendly cartoon explosion
    noise({ d: 0.9, v: 0.32, from: 1800, to: 90, q: 0.6 });
    tone({ f: 140, to: 38, d: 0.7, type: "sine", v: 0.35 });
    tone({ f: 420, to: 120, d: 0.25, type: "square", v: 0.06 });
    [24, 28, 31].forEach((s2, i) => bell(s2, 0.18 + i * 0.07, 0.07, 0.4));
  },
  select() { tone({ f: 660, to: 990, d: 0.12, type: "sine", v: 0.2 }); bell(28, 0.05, 0.08, 0.35); },
};

export function play(name) {
  if (!settings.sfx || settings.muted) return;
  const c = ensure();
  if (!c || c.state !== "running") return;
  try { SOUNDS[name]?.(); } catch { /* audio must never break the game */ }
}

// ---------------------------------------------------------------- music player
const PENTA = [0, 2, 4, 7, 9];

function scheduleBar(theme, out, at, barIndex) {
  const chord = theme.chords[barIndex % theme.chords.length];
  const B = theme.bar;
  // pad
  let padOut = out;
  if (theme.padFilter) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = theme.padFilter;
    f.connect(out);
    padOut = f;
  }
  chord.forEach((s, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = theme.pad;
    o.frequency.value = N(s);
    o.detune.value = (i - chord.length / 2) * 5;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(theme.padVol, at + Math.min(1.2, B * 0.3));
    g.gain.linearRampToValueAtTime(theme.padVol * 0.75, at + B - 0.3);
    g.gain.linearRampToValueAtTime(0.0001, at + B + 0.6);
    o.connect(g).connect(padOut);
    o.start(at);
    o.stop(at + B + 0.7);
  });
  // melody / arpeggio
  const a = theme.arp;
  const pool = a.pentatonic ? PENTA.map((p) => p + chord[0]) : [...chord, ...chord.map((s) => s + 12)];
  for (let i = 0; i < a.steps; i++) {
    if (Math.random() < a.skip) continue;
    const idx = a.rising ? (i + barIndex) % pool.length : (i * 3 + barIndex * 2) % pool.length;
    tone({ f: N(pool[idx] + a.oct), at: at + i * (B / a.steps), d: a.len, type: a.type, v: a.vol, a: 0.01, bus: out });
  }
  // bass
  const b = theme.bass;
  let bassOut = out;
  if (b.filter) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = b.filter;
    f.connect(out);
    bassOut = f;
  }
  for (let i = 0; i < b.pulse; i++) {
    const len = B / b.pulse;
    tone({ f: N(chord[0] - 24), at: at + i * len, d: len * 0.92, type: b.type, v: b.vol, a: 0.03, bus: bassOut });
  }
  // percussion
  if (theme.kick) for (let i = 0; i < 4; i += 2) tone({ f: 120, to: 45, at: at + i * (B / 4), d: 0.22, type: "sine", v: theme.kick, bus: out });
  if (theme.timpani && barIndex % 2 === 1) tone({ f: N(chord[0] - 24) * 1.5, to: N(chord[0] - 24), at: at + B * 0.75, d: 0.6, type: "triangle", v: 0.2, bus: out });
  if (theme.hat) for (let i = 1; i < 8; i += 2) noise({ at: at + i * (B / 8), d: 0.05, v: theme.hat, from: 7000, to: 9000, q: 1, bus: out });
}

// Sing-along songs: a music-box melody with a soft bass and chord on strong beats.
function chordFor(semi) {
  const pc = ((semi % 12) + 12) % 12;
  if (pc === 5 || pc === 9) return [5, 9, 12];   // F major
  if (pc === 2 || pc === 11) return [7, 11, 14]; // G major
  return [0, 4, 7];                               // C major
}

function scheduleSongNote(song, out, at, index) {
  const notes = song.notes;
  const i = index % (notes.length + 1);
  const beat = 60 / song.bpm;
  if (i === notes.length) return beat * 2; // short breath before the song repeats
  const [semi, beats] = notes[i];
  const dur = beats * beat;
  if (semi !== null) {
    // music-box voice
    tone({ f: N(semi + 12), at, d: Math.max(0.35, dur * 1.3), type: "sine", v: 0.16, a: 0.008, bus: out });
    tone({ f: N(semi + 24), at, d: Math.max(0.25, dur * 0.8), type: "triangle", v: 0.035, a: 0.005, bus: out });
    // accompaniment on long or phrase-start notes
    if (beats >= 1 || i === 0) {
      const chord = chordFor(semi);
      tone({ f: N(chord[0] - 12), at, d: dur * 0.95, type: "triangle", v: 0.09, a: 0.02, bus: out });
      chord.forEach((c) => tone({ f: N(c), at, d: dur * 0.9, type: "sine", v: 0.025, a: 0.03, bus: out }));
    }
  }
  return dur;
}

function startTheme(id, isPreview = false) {
  if (!ctx) return;
  const theme = themeById(id);
  if (track?.id === theme.id) return;
  stopTheme(0.9); // crossfade out the old track
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
  gain.connect(musicBus);
  const t = { id: theme.id, gain, nextBar: ctx.currentTime + 0.08, bar: 0, timer: null, preview: isPreview, note: 0 };
  const tick = () => {
    if (!ctx || ctx.state !== "running") return;
    while (t.nextBar < ctx.currentTime + 3) {
      try {
        if (theme.song) t.nextBar += scheduleSongNote(theme.song, gain, t.nextBar, t.note++);
        else { scheduleBar(theme, gain, t.nextBar, t.bar++); t.nextBar += theme.bar; }
      } catch { t.nextBar += 0.5; /* never break the game */ }
    }
  };
  tick();
  t.timer = window.setInterval(tick, 500);
  track = t;
}

function stopTheme(fade = 0.6) {
  if (!track || !ctx) { track = null; return; }
  const old = track;
  track = null;
  window.clearInterval(old.timer);
  const now = ctx.currentTime;
  old.gain.gain.cancelScheduledValues(now);
  old.gain.gain.setValueAtTime(old.gain.gain.value, now);
  old.gain.gain.linearRampToValueAtTime(0.0001, now + fade);
  window.setTimeout(() => { try { old.gain.disconnect(); } catch { /* ignore */ } }, (fade + 3.5) * 1000);
}

/** Quietly lower the music for a moment (e.g. during a fanfare). */
export function duck(seconds = 3) {
  if (!ctx || musicLevel() === 0) return;
  beginDuck();
  window.setTimeout(endDuck, seconds * 1000);
}
function beginDuck() { duckDepth += 1; applyLevels(0.08); }
function endDuck() { duckDepth = Math.max(0, duckDepth - 1); applyLevels(0.6); }

/** Pause audio while the tab is hidden. */
export function setPaused(paused) {
  if (!ctx) return;
  if (paused && ctx.state === "running") ctx.suspend().catch(() => {});
  if (!paused && ctx.state === "suspended") ctx.resume().catch(() => {});
}

// ---------------------------------------------------------------- haptics & voice
export function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch { /* ignore */ }
}

let finishActiveSpeech = null;

function utter(text, { lang = "en-US", rate = 0.95, pitch = 1.2, onEnd } = {}) {
  if (!("speechSynthesis" in window)) return false;
  try {
    finishActiveSpeech?.();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, ""));
    u.lang = lang;
    u.rate = rate;
    u.pitch = pitch;
    const voices = window.speechSynthesis.getVoices?.() || [];
    const match = voices.find((v) => v.lang?.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
    if (match) u.voice = match;
    let ducked = false;
    u.onstart = () => { if (!ducked) { ducked = true; beginDuck(); } };
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      if (finishActiveSpeech === done) finishActiveSpeech = null;
      if (ducked) { ducked = false; endDuck(); }
      onEnd?.();
    };
    finishActiveSpeech = done;
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}

/** Mascot tips: only when the player turned "read aloud" on. */
export function speak(text) {
  if (!settings.voice || settings.muted) return;
  utter(text, { pitch: 1.35 });
}

/** Explicit "Read aloud" buttons. The music is lowered while speaking. */
export function speakAloud(text, { lang = "en-US", onEnd } = {}) {
  return utter(text, { lang, pitch: 1.1, onEnd });
}

export function stopSpeaking() {
  finishActiveSpeech?.();
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}
