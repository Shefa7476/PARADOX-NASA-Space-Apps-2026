import { useEffect, useRef, useState } from "react";
import { ChevronDown, Mic, MicOff, Music, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, Waves } from "lucide-react";
import {
  MUSIC_THEMES, getSettings, nextTheme, prevTheme, previewTheme, setMuteAll,
  setSetting, setTheme, setVolume, subscribe, toggleMusic, unlock,
} from "../audio/sfx";

// Small, collapsible music controller. Lives outside the router, so the
// music keeps playing smoothly while the player moves between pages.
export default function MusicCenter() {
  const [s, setS] = useState(getSettings());
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => subscribe(setS), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [open]);

  const current = MUSIC_THEMES.find((t) => t.id === (s.previewing || s.theme)) || MUSIC_THEMES[0];
  const playing = s.music && !s.muted;

  return (
    <div className={`sound-dock music-center ${open ? "is-open" : ""}`} ref={rootRef} role="region" aria-label="Music and sound controls">
      {open && (
        <div className="music-panel" role="dialog" aria-label="Music Control Center">
          <header>
            <div><span className="eyebrow">MUSIC CONTROL CENTER</span><h3>Choose your space soundtrack</h3></div>
            <button type="button" className="mc-icon" onClick={() => setOpen(false)} aria-label="Close music controls"><ChevronDown size={16} /></button>
          </header>
          {[["space", "🌌 Space soundtracks"], ["songs", "🎶 Sing-along songs"]].map(([cat, label]) => (
            <section key={cat} className="music-cat">
              <h4>{label}</h4>
              <div className="music-theme-grid">
                {MUSIC_THEMES.filter((t) => (t.category || "space") === cat).map((t) => {
                  const selected = s.theme === t.id;
                  const previewing = s.previewing === t.id;
                  return (
                    <div key={t.id} className={`music-theme-card ${selected ? "selected" : ""} ${previewing ? "previewing" : ""}`} style={{ "--c1": t.colors[0], "--c2": t.colors[1] }}>
                      <button type="button" className="mt-select" onClick={() => setTheme(t.id)} aria-pressed={selected} aria-label={`Select ${t.name}`}>
                        <span className="mt-emoji" aria-hidden="true">{t.emoji}</span>
                        <span className="mt-copy"><b>{t.name}</b><small>{t.mood}</small></span>
                        {selected && <span className="mt-badge">{playing ? "PLAYING" : "SELECTED"}</span>}
                      </button>
                      <button type="button" className="mt-preview" onClick={() => previewTheme(t.id)} aria-label={`Preview ${t.name} for a few seconds`}>
                        {previewing ? <Waves size={13} /> : <Play size={12} />} {previewing ? "Previewing" : "Preview"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          <div className="music-sliders">
            <label><span><Music size={14} /> Music volume <b>{Math.round(s.musicVolume * 100)}%</b></span>
              <input type="range" min="0" max="100" value={Math.round(s.musicVolume * 100)} onChange={(e) => setVolume("music", e.target.value / 100)} aria-label="Music volume" />
            </label>
            <label><span><Volume2 size={14} /> Sound effects <b>{Math.round(s.sfxVolume * 100)}%</b></span>
              <input type="range" min="0" max="100" value={Math.round(s.sfxVolume * 100)} onChange={(e) => setVolume("sfx", e.target.value / 100)} aria-label="Sound effects volume" />
            </label>
          </div>
          <div className="music-toggles">
            <button type="button" className={s.sfx ? "on" : ""} aria-pressed={s.sfx} onClick={() => setSetting("sfx", !s.sfx)}>{s.sfx ? <Volume2 size={14} /> : <VolumeX size={14} />} Effects {s.sfx ? "on" : "off"}</button>
            <button type="button" className={s.voice ? "on" : ""} aria-pressed={s.voice} onClick={() => setSetting("voice", !s.voice)}>{s.voice ? <Mic size={14} /> : <MicOff size={14} />} Read Zippy's tips</button>
            <button type="button" className={`mute-all ${s.muted ? "on" : ""}`} aria-pressed={s.muted} onClick={() => setMuteAll(!s.muted)}>{s.muted ? <VolumeX size={14} /> : <Volume2 size={14} />} {s.muted ? "Unmute all" : "Mute all"}</button>
          </div>
          <p className="music-note">Space soundtracks are original; sing-along songs are traditional public-domain nursery tunes. Everything is played live in your browser, with no downloads. It pauses when this tab is hidden and gets quieter while Zippy talks.</p>
        </div>
      )}

      <div className="music-bar">
        <button type="button" className="mc-now" onClick={() => { unlock(); setOpen((v) => !v); }} aria-expanded={open} aria-label={`Open music controls. Now: ${current.name}`} title="Music Control Center">
          <span className={`mc-eq ${playing ? "live" : ""}`} aria-hidden="true"><i /><i /><i /></span>
          <span className="mc-title">{current.emoji} <span>{current.name}</span></span>
        </button>
        <button type="button" className="mc-icon mc-hide-sm" onClick={prevTheme} aria-label="Previous music theme" title="Previous track"><SkipBack size={15} /></button>
        <button type="button" className="mc-icon mc-play" onClick={() => { if (s.muted) setMuteAll(false); else toggleMusic(); }} aria-label={playing ? "Pause music" : "Play music"} title={playing ? "Pause" : "Play"}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button type="button" className="mc-icon mc-hide-sm" onClick={nextTheme} aria-label="Next music theme" title="Next track"><SkipForward size={15} /></button>
        <button type="button" className={`mc-icon ${s.muted ? "danger" : ""}`} onClick={() => setMuteAll(!s.muted)} aria-pressed={s.muted} aria-label={s.muted ? "Unmute all sound" : "Mute all sound"} title={s.muted ? "Unmute all" : "Mute all"}>
          {s.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>
    </div>
  );
}
