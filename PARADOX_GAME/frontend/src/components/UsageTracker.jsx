import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";

const dayKey = () => new Date().toLocaleDateString("en-CA");
function getToday() { try { const value=JSON.parse(localStorage.getItem("paradox_daily_usage")||"{}"); return value.date===dayKey()?value:{date:dayKey(),seconds:0}; } catch { return {date:dayKey(),seconds:0}; } }

export default function UsageTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const [breakNotice, setBreakNotice] = useState(false);
  useEffect(() => {
    if (!user) return undefined;
    const tick = () => {
      if (document.hidden) return;
      const data=getToday(); data.seconds=(data.seconds||0)+30; localStorage.setItem("paradox_daily_usage",JSON.stringify(data));
      window.dispatchEvent(new Event("paradox:usage-updated"));
      const limit=Number(localStorage.getItem("paradox_daily_limit")||45);
      if (limit>0 && data.seconds>=limit*60 && localStorage.getItem("paradox_break_dismissed")!==dayKey()) setBreakNotice(true);
    };
    const id=window.setInterval(tick,30000);
    return()=>window.clearInterval(id);
  },[user,location.pathname]);
  useEffect(()=>{const onPrefs=()=>{const data=getToday();const limit=Number(localStorage.getItem("paradox_daily_limit")||45);if(limit>0&&data.seconds>=limit*60&&localStorage.getItem("paradox_break_dismissed")!==dayKey())setBreakNotice(true);};window.addEventListener("paradox:preferences-updated",onPrefs);return()=>window.removeEventListener("paradox:preferences-updated",onPrefs);},[]);
  if (!breakNotice) return null;
  return <div className="usage-break-backdrop" role="dialog" aria-modal="true" aria-labelledby="break-title"><section className="usage-break-card"><span>🌟</span><h2 id="break-title">Great exploring today!</h2><p>You have reached the daily play-time reminder. A short screen break, a drink of water and a stretch can help you feel fresh.</p><button onClick={()=>{localStorage.setItem("paradox_break_dismissed",dayKey());setBreakNotice(false);}}>I’ll take a break</button><small>A parent or guardian can change this reminder in Parent Zone.</small></section></div>;
}
