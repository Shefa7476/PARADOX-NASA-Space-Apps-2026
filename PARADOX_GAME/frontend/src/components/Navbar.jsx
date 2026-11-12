import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bot, Brain, ChevronDown, CloudLightning, FlaskConical, GraduationCap, LayoutDashboard, LogOut, Menu,
  Orbit, Rocket, Settings, Shield, Timer, CircleUser, Waypoints, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { openAskAI } from "../services/tutorApi";
import EnergyBar from "./EnergyBar";

const primaryLinks = [
  { to: "/missions", label: "Solar System", icon: Orbit },
  { to: "/space-academy", label: "Academy", icon: GraduationCap },
  { to: "/time-attack", label: "Cosmic Quiz", icon: Timer },
  { to: "/account", label: "Dashboard", icon: LayoutDashboard },
];

const moreLinks = [
  { to: "/planet-smash", label: "Planet Smash 💥", icon: Rocket },
  { to: "/advanced", label: "Advanced Missions", icon: Rocket },
  { to: "/solar-storm", label: "Solar Storm", icon: CloudLightning },
  { to: "/branching", label: "Branching AI Mission", icon: Waypoints },
  { to: "/ai-lab", label: "AI Mission Lab", icon: FlaskConical },
  { to: "/parent", label: "Parent Zone", icon: Shield },
  { to: "/settings", label: "Settings", icon: Settings },
];

function useDismiss(open, setOpen, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open, setOpen, ref]);
}

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const moreRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useDismiss(moreOpen, setMoreOpen, moreRef);
  useDismiss(profileOpen, setProfileOpen, profileRef);
  useEffect(() => { setOpen(false); setMoreOpen(false); setProfileOpen(false); }, [location.pathname]);

  async function handleLogout() {
    try { await logout(); }
    finally { setOpen(false); navigate("/"); }
  }

  const linkClass = ({ isActive }) => `nav-link ${isActive ? "active" : ""}`;
  const moreActive = moreLinks.some((l) => location.pathname.startsWith(l.to));

  return (
    <header className="paradox-nav">
      <nav className="nav-inner" aria-label="Main navigation">
        <Link to="/" className="nav-brand" aria-label="PARADOX home">
          <span className="brand-mark"><Rocket size={17} /></span>
          <span className="nav-brand-text">PARADOX<small>SPACE ACADEMY</small></span>
        </Link>

        {!loading && user && (
          <div className="nav-links desktop-only">
            {primaryLinks.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}><Icon size={15} /> {label}</NavLink>
            ))}
            <div className="nav-more" ref={moreRef}>
              <button type="button" className={`nav-link ${moreActive ? "active" : ""}`} aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
                <Brain size={15} /> More <ChevronDown size={14} className={moreOpen ? "flip" : ""} />
              </button>
              {moreOpen && (
                <div className="nav-menu" role="menu">
                  {moreLinks.map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} to={to} role="menuitem" className={({ isActive }) => `nav-menu-item ${isActive ? "active" : ""}`}><Icon size={15} /> {label}</NavLink>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="nav-right">
          {!loading && user ? (
            <>
              <EnergyBar />
              <button type="button" className="nav-ask desktop-only" onClick={() => openAskAI({})}><Bot size={15} /> Ask AI</button>
              <div className="nav-profile desktop-only" ref={profileRef}>
                <button type="button" className="nav-profile-btn" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((v) => !v)}>
                  <CircleUser size={17} /> <span>{user.display_name}</span> <ChevronDown size={13} />
                </button>
                {profileOpen && (
                  <div className="nav-menu right" role="menu">
                    <NavLink to="/profile" role="menuitem" className="nav-menu-item"><CircleUser size={15} /> My profile</NavLink>
                    <NavLink to="/certificate" role="menuitem" className="nav-menu-item"><GraduationCap size={15} /> Certificate</NavLink>
                    <button type="button" role="menuitem" className="nav-menu-item danger" onClick={handleLogout}><LogOut size={15} /> Log out</button>
                  </div>
                )}
              </div>
            </>
          ) : !loading ? (
            <div className="nav-auth">
              <Link to="/login" className="nav-btn ghost">Log in</Link>
              <Link to="/signup" className="nav-btn solid">Join the crew</Link>
            </div>
          ) : null}
          {!loading && user && (
            <button type="button" className="nav-toggle mobile-only" onClick={() => setOpen(!open)} aria-label="Toggle navigation menu" aria-expanded={open}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>
      </nav>

      {open && user && (
        <div className="nav-drawer mobile-only">
          <p className="nav-drawer-label">PLAY</p>
          {primaryLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={linkClass}><Icon size={16} /> {label}</NavLink>)}
          <p className="nav-drawer-label">MORE</p>
          {moreLinks.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={linkClass}><Icon size={16} /> {label}</NavLink>)}
          <p className="nav-drawer-label">ACCOUNT</p>
          <NavLink to="/profile" className={linkClass}><CircleUser size={16} /> {user.display_name}</NavLink>
          <button type="button" className="nav-link" onClick={() => { setOpen(false); openAskAI({}); }}><Bot size={16} /> Ask AI</button>
          <button type="button" className="nav-link danger" onClick={handleLogout}><LogOut size={16} /> Log out</button>
        </div>
      )}
    </header>
  );
}
