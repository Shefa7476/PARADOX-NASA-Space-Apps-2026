import { BADGES, ROCKETS, SUITS, find } from "../avatar/avatarStore";

// Friendly astronaut + their rocket, drawn in SVG so colours can change instantly.
export default function AstronautAvatar({ avatar, size = 120, showRocket = true, className = "" }) {
  const suit = find(SUITS, avatar.suit).color;
  const badge = find(BADGES, avatar.badge).icon;
  const rocket = find(ROCKETS, avatar.rocket).color;
  return (
    <svg className={`astro-avatar ${className}`} viewBox="0 0 150 130" width={size} height={size * (130 / 150)} role="img" aria-label="Your astronaut">
      <defs>
        <radialGradient id="av-helm" cx="35%" cy="28%" r="80%"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#c9dcff" /></radialGradient>
        <linearGradient id="av-visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10224a" /><stop offset="1" stopColor="#24498f" /></linearGradient>
      </defs>
      {showRocket && (
        <g transform="translate(108 52) rotate(18)">
          <path d="M16 0 C28 14 30 36 27 58 L5 58 C2 36 4 14 16 0Z" fill="#f4f8ff" />
          <path d="M16 0 C22 8 25 17 26 26 L6 26 C7 17 10 8 16 0Z" fill={rocket} />
          <circle cx="16" cy="38" r="6" fill="#2b6fe8" stroke="#cfe3ff" strokeWidth="2" />
          <path d="M5 40 L-4 60 L7 55Z" fill={rocket} /><path d="M27 40 L36 60 L25 55Z" fill={rocket} />
          <path d="M10 58 Q16 78 22 58Z" fill="#ffb347" />
        </g>
      )}
      <rect x="22" y="70" width="20" height="40" rx="10" fill={suit} transform="rotate(14 32 70)" />
      <rect x="68" y="70" width="20" height="40" rx="10" fill={suit} transform="rotate(-14 78 70)" />
      <rect x="28" y="62" width="54" height="52" rx="22" fill={suit} />
      <rect x="28" y="62" width="54" height="52" rx="22" fill="url(#av-helm)" opacity=".12" />
      <circle cx="30" cy="104" r="8" fill="#fff" /><circle cx="80" cy="104" r="8" fill="#fff" />
      <rect x="34" y="112" width="16" height="12" rx="6" fill="#e6efff" /><rect x="60" y="112" width="16" height="12" rx="6" fill="#e6efff" />
      <circle cx="55" cy="88" r="12" fill="#fff" opacity=".92" />
      <text x="55" y="93" textAnchor="middle" fontSize="14">{badge}</text>
      <circle cx="55" cy="38" r="33" fill="url(#av-helm)" />
      <rect x="35" y="22" width="40" height="30" rx="15" fill="url(#av-visor)" />
      <ellipse cx="47" cy="36" rx="4" ry="5.5" fill="#7df9ff" /><ellipse cx="63" cy="36" rx="4" ry="5.5" fill="#7df9ff" />
      <circle cx="48.5" cy="34" r="1.4" fill="#fff" /><circle cx="64.5" cy="34" r="1.4" fill="#fff" />
      <path d="M49 44 Q55 49 61 44" stroke="#7df9ff" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M40 18 Q52 10 66 16" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" />
      <rect x="20" y="30" width="8" height="16" rx="4" fill={suit} /><rect x="82" y="30" width="8" height="16" rx="4" fill={suit} />
    </svg>
  );
}
