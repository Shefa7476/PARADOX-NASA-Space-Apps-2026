// Tiny event bus so sound, mascot, confetti and HUD can react to the same moments.
// Types: correct | wrong | success | fail | levelup | achievement | xp | route
export const FX_EVENT = "paradox:fx";
export function emitFx(type, detail = {}) {
  window.dispatchEvent(new CustomEvent(FX_EVENT, { detail: { type, ...detail } }));
}
export function onFx(handler) {
  const fn = (e) => handler(e.detail);
  window.addEventListener(FX_EVENT, fn);
  return () => window.removeEventListener(FX_EVENT, fn);
}
