import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { speak, play } from "../audio/sfx";
import { onFx } from "../audio/fxBus";

const FACTS = [
  "Did you know? Saturn's rings are made mostly of ice! 🧊",
  "A day on Venus is longer than its whole year! 🌀",
  "Jupiter is so big that over 1,300 Earths could fit inside! 🪐",
  "The Sun is a star, and it is the boss of our Solar System! ☀️",
  "Mars looks red because of rusty iron dust! 🔴",
  "Astronauts float because they are always falling around Earth! 🧑‍🚀",
  "Neptune has super fast winds, faster than any storm on Earth! 💨",
  "Light from the Sun takes about 8 minutes to reach us! ⚡",
  "Mercury is the closest planet to the Sun, but not the hottest! 🔥",
  "There are more stars in space than grains of sand on Earth! ✨",
];

const ROUTE_LINES = {
  "/": "Hi explorer! I'm Zippy! 🚀 Tap Join the crew and let's fly!",
  "/login": "Welcome back! I missed you! 💙",
  "/signup": "Yay, a new crew member! Pick a cool name! ⭐",
  "/missions": "Pick a planet! Each world has 3 adventures. 🪐",
  "/advanced": "Advanced missions! Use your super space brain! 🧠",
  "/solar-storm": "Whoa, a solar storm! Watch the clues, Commander! ☀️",
  "/branching": "Every choice makes a new path. Choose wisely! 🌿",
  "/ai-lab": "AI Lab time! Think like a real scientist! 🔬",
  "/time-attack": "Cosmic Quiz! Quick fingers, bright brain! ⏱️",
  "/account": "Look at all your stars and badges! 🏆",
  "/profile": "This is your explorer card. Looking good! 😎",
};

const REACT = {
  correct: { mood: "happy", lines: ["Boom! Brilliant answer! 🌟", "Yes! You are a space genius! 🎉", "Correct! High five! ✋"] },
  wrong: { mood: "kind", lines: ["Good try! Every explorer learns by trying again! 💪", "Oops! No worries, check the clue and go again! 🔍", "Almost! Mistakes help us discover! 🌱"] },
  success: { mood: "cheer", lines: ["YOU DID IT!! Mission complete! 🎊", "Hooray, Commander! Amazing work! 🏆"] },
  fail: { mood: "kind", lines: ["Don't give up, explorer! Let's try again together! 🚀", "Even astronauts try many times! You've got this! 💙"] },
  levelup: { mood: "cheer", lines: ["LEVEL UP!! You're getting stronger! ⭐"] },
  "mission-start": { mood: "cheer", lines: ["Engines on! Read the briefing, Commander! 🚀", "Mission launched! I'm right here if you need a hint. 🛰️", "New mission, new discoveries! Let's go! ✨"] },
  "follow-up": { mood: "kind", lines: ["Let's look at that idea from another angle. 🔭", "Here's a related question to help it click! 💡"] },
  challenge: { mood: "happy", lines: ["You're on a streak! Here's a data challenge! 📊", "Ooh, time for a real scientist question! 🧪"] },
  tip: { mood: "talk", lines: ["Tip: read every option before you choose! 👀", "Tip: tap Ask AI if a word is new to you. 🤖"] },
  avatar: { mood: "happy", lines: ["Ooh, so stylish! 😎", "Looking like a real astronaut! 🧑‍🚀", "That colour is awesome! 🎨"] },
  "avatar-locked": { mood: "kind", lines: ["That one unlocks at a higher level. Keep exploring! 🔓"] },
  achievement: { mood: "happy", lines: ["A new badge! Wow, so shiny! 🏅"] },
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const HIDE_KEY = "paradox_zippy_hidden";

export default function Mascot() {
  const location = useLocation();
  const [mood, setMood] = useState("idle");
  const [bubble, setBubble] = useState("");
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDE_KEY) === "1");
  const bubbleTimer = useRef(0);
  const moodTimer = useRef(0);
  const lastRoute = useRef("");
  const hiddenRef = useRef(hidden);
  useEffect(() => { hiddenRef.current = hidden; }, [hidden]);

  const say = useCallback((text, nextMood = "talk", ms = 6500) => {
    if (hiddenRef.current) return;
    window.clearTimeout(bubbleTimer.current);
    window.clearTimeout(moodTimer.current);
    setBubble(text);
    setMood(nextMood);
    speak(text);
    bubbleTimer.current = window.setTimeout(() => setBubble(""), ms);
    moodTimer.current = window.setTimeout(() => setMood("idle"), Math.min(ms, 3200));
  }, []);

  // reacts to game moments
  useEffect(() => onFx(({ type, path }) => {
    if (type === "route") {
      if (lastRoute.current === path) return;
      lastRoute.current = path;
      const line = ROUTE_LINES[path] || (path.startsWith("/mission/") ? "Mission Control! Read the clues first. 🔭" : "");
      if (line) window.setTimeout(() => say(line), 700);
      return;
    }
    const r = REACT[type];
    if (r) say(pick(r.lines), r.mood, 5200);
  }), [say]);

  // gentle idle tips
  useEffect(() => {
    const id = window.setInterval(() => { if (!document.hidden) say(pick(FACTS), "talk", 7000); }, 55000);
    return () => window.clearInterval(id);
  }, [say]);

  useEffect(() => () => { window.clearTimeout(bubbleTimer.current); window.clearTimeout(moodTimer.current); }, []);

  function toggleHidden() {
    const next = !hidden;
    setHidden(next);
    localStorage.setItem(HIDE_KEY, next ? "1" : "0");
    setBubble("");
    if (!next) window.setTimeout(() => say("I'm back! Let's explore! 🚀", "happy", 3500), 100);
  }

  if (hidden) {
    return <button type="button" className="zippy-peek" onClick={toggleHidden} aria-label="Bring Zippy back" title="Bring Zippy back">🤖</button>;
  }

  return (
    <div className={`zippy zippy-${mood}`} data-route={location.pathname}>
      {bubble && <div className="zippy-bubble" role="status" aria-live="polite">{bubble}</div>}
      <button type="button" className="zippy-body" onClick={() => { play("mascot"); say(pick(FACTS), "happy", 7000); }} aria-label="Zippy the robot. Tap for a space fact.">
        <svg viewBox="0 0 120 150" width="100%" height="100%" aria-hidden="true">
          <defs>
            <radialGradient id="zp-head" cx="35%" cy="28%" r="80%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#b9d4ff" /></radialGradient>
            <radialGradient id="zp-body" cx="35%" cy="25%" r="85%"><stop offset="0" stopColor="#8be9ff" /><stop offset="1" stopColor="#2f7cf0" /></radialGradient>
            <linearGradient id="zp-visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10224a" /><stop offset="1" stopColor="#1b3a7a" /></linearGradient>
          </defs>
          <ellipse cx="60" cy="144" rx="30" ry="5" fill="rgba(0,0,0,.35)" className="zp-shadow" />
          <g className="zp-flame"><path d="M48 118 Q54 142 60 128 Q66 142 72 118 Z" fill="#ffb347" /><path d="M53 118 Q58 134 60 124 Q62 134 67 118 Z" fill="#fff3a8" /></g>
          <g className="zp-arm-l"><rect x="14" y="78" width="14" height="32" rx="7" fill="url(#zp-body)" /><circle cx="21" cy="112" r="8" fill="#fff" /></g>
          <g className="zp-arm-r"><rect x="92" y="78" width="14" height="32" rx="7" fill="url(#zp-body)" /><circle cx="99" cy="112" r="8" fill="#fff" /></g>
          <rect x="34" y="76" width="52" height="46" rx="20" fill="url(#zp-body)" />
          <circle cx="60" cy="98" r="9" fill="#fff" opacity=".9" /><circle cx="60" cy="98" r="5" fill="#ff7ab8" className="zp-heart" />
          <line x1="60" y1="8" x2="60" y2="24" stroke="#b9d4ff" strokeWidth="4" strokeLinecap="round" />
          <circle cx="60" cy="8" r="6" fill="#ff7ab8" className="zp-antenna" />
          <rect x="22" y="22" width="76" height="62" rx="30" fill="url(#zp-head)" />
          <rect x="30" y="32" width="60" height="38" rx="19" fill="url(#zp-visor)" />
          <g className="zp-eyes">
            <ellipse cx="48" cy="50" rx="6" ry="8" fill="#7df9ff" className="zp-eye" /><ellipse cx="72" cy="50" rx="6" ry="8" fill="#7df9ff" className="zp-eye" />
            <circle cx="50" cy="47" r="2" fill="#fff" /><circle cx="74" cy="47" r="2" fill="#fff" />
          </g>
          <path className="zp-mouth zp-mouth-smile" d="M52 62 Q60 69 68 62" stroke="#7df9ff" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path className="zp-mouth zp-mouth-kind" d="M52 65 Q60 60 68 65" stroke="#7df9ff" strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="36" cy="62" rx="5" ry="3" fill="#ff9ec9" opacity=".55" /><ellipse cx="84" cy="62" rx="5" ry="3" fill="#ff9ec9" opacity=".55" />
        </svg>
      </button>
      <button type="button" className="zippy-hide" onClick={toggleHidden} aria-label="Hide Zippy" title="Hide Zippy">×</button>
    </div>
  );
}
