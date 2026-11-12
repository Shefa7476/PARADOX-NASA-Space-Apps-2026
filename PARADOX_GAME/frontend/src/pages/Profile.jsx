import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Mail, ShieldCheck, UserRound, Settings, Award } from "lucide-react";
import { API_BASE_URL, useAuth } from "../context/AuthContext";
import { authFetch } from "../services/api";
import TutorialReplayButton from "../components/TutorialReplayButton";
import AvatarStudio from "../components/AvatarStudio";
import AstronautAvatar from "../components/AstronautAvatar";
import { AVATAR_EVENT, loadAvatar } from "../avatar/avatarStore";

export default function Profile() {
  const { user } = useAuth();
  const [avatar, setAvatar] = useState(() => loadAvatar(user?.id));
  const [stats, setStats] = useState(null);
  useEffect(() => { let active=true; authFetch(`${API_BASE_URL}/api/account/summary`).then(r=>r.ok?r.json():null).then(d=>{if(active&&d)setStats(d.stats);}).catch(()=>{}); return()=>{active=false;}; }, []);
  useEffect(() => { const refresh=()=>setAvatar(loadAvatar(user?.id)); window.addEventListener(AVATAR_EVENT,refresh); return()=>window.removeEventListener(AVATAR_EVENT,refresh); }, [user?.id]);
  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"}) : "Explorer";
  return <main className="account-page mx-auto max-w-4xl px-5 py-12 md:px-8">
    <p className="auth-eyebrow">YOUR EXPLORER ID</p><h1 className="account-section-title text-4xl">Player Profile</h1>
    <section className="profile-panel mt-8">
      <div className="profile-avatar profile-avatar-generated"><AstronautAvatar avatar={avatar} size={92} /></div>
      <div className="min-w-0 flex-1"><p className="auth-eyebrow">PARADOX SPACE CREW</p><h2>{user?.display_name}</h2><p>@{user?.username}</p></div>
      <span className="profile-verified"><ShieldCheck size={16}/> PILOT</span>
      <div className="profile-details"><div><Mail/><span><small>PARENT / GUARDIAN EMAIL</small><strong>{user?.email}</strong></span></div><div><CalendarDays/><span><small>CREW MEMBER SINCE</small><strong>{joined}</strong></span></div><div><Award/><span><small>EXPLORER XP</small><strong>{stats?.xp || 0}</strong></span></div><div><UserRound/><span><small>MISSIONS COMPLETED</small><strong>{stats?.missions_successful || 0}</strong></span></div></div>
      <p className="profile-feedback profile-feedback-success">Your astronaut avatar is generated in the game. Personal profile-photo uploads are disabled to keep this child-focused project safer.</p>
      <div className="mt-7 flex w-full flex-wrap gap-3"><Link to="/account" className="account-primary">Open player dashboard</Link><Link to="/settings" className="account-primary"><Settings size={16}/> Explorer settings</Link><TutorialReplayButton/></div>
    </section>
    <AvatarStudio />
  </main>;
}
