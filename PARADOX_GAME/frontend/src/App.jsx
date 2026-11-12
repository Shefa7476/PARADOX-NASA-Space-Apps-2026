import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import WelcomeTutorial from "./components/WelcomeTutorial";
import FunEffects from "./components/FunEffects";
import GameAudio from "./components/GameAudio";
import Mascot from "./components/Mascot";
import GameHUD from "./components/GameHUD";
import Celebration from "./components/Celebration";
import LaunchCinematic from "./components/LaunchCinematic";
import UsageTracker from "./components/UsageTracker";
import AskAIChat from "./components/AskAIChat";
import CosmicBackdrop from "./components/CosmicBackdrop";
import { NovaLoading } from "./components/Cartoons";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { applyPreferences } from "./services/preferences";
import "./styles/space.css";
import "./styles/kids-3d.css";
import "./styles/game-feel.css";
import "./styles/theme.css";
import "./styles/academy.css";
import "./styles/cartoons.css";

const SpaceScene3D = lazy(() => import("./components/SpaceScene3D"));
const Missions = lazy(() => import("./pages/Missions"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdvancedDashboard = lazy(() => import("./pages/AdvancedDashboard"));
const SolarStorm = lazy(() => import("./pages/SolarStorm"));
const BranchingMission = lazy(() => import("./pages/BranchingMission"));
const MissionDebrief = lazy(() => import("./pages/MissionDebrief"));
const AIMissionLab = lazy(() => import("./pages/AIMissionLab"));
const Profile = lazy(() => import("./pages/Profile"));
const AccountDashboard = lazy(() => import("./pages/AccountDashboard"));
const TimeAttackQuiz = lazy(() => import("./pages/TimeAttackQuiz"));
const SpaceAcademy = lazy(() => import("./pages/SpaceAcademy"));
const ParentZone = lazy(() => import("./pages/ParentZone"));
const AccessibilitySettings = lazy(() => import("./pages/AccessibilitySettings"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Certificate = lazy(() => import("./pages/Certificate"));
const PlanetSmash = lazy(() => import("./pages/PlanetSmash"));

applyPreferences();

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <main className="route-loading"><NovaLoading text="Checking your explorer account…" /></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function LoadingScreen() {
  return <div className="route-loading"><NovaLoading /></div>;
}

function AppRoutes() {
  const location = useLocation();
  return <>
    <div className="app-shell min-h-screen text-white">
      <Suspense fallback={null}><SpaceScene3D /></Suspense>
      <CosmicBackdrop />
      <FunEffects />
      <div className="space-dust space-dust-one"/><div className="space-dust space-dust-two"/>
      <Navbar />
      <GameHUD />
      <div className="app-content" key={location.pathname.split("/")[1] || "home"}>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/missions" element={<ProtectedRoute><Missions /></ProtectedRoute>} />
            <Route path="/mission/:id" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/advanced" element={<ProtectedRoute><AdvancedDashboard /></ProtectedRoute>} />
            <Route path="/solar-storm" element={<ProtectedRoute><SolarStorm /></ProtectedRoute>} />
            <Route path="/branching" element={<ProtectedRoute><BranchingMission /></ProtectedRoute>} />
            <Route path="/debrief/:sessionId" element={<ProtectedRoute><MissionDebrief /></ProtectedRoute>} />
            <Route path="/ai-lab" element={<ProtectedRoute><AIMissionLab /></ProtectedRoute>} />
            <Route path="/time-attack" element={<ProtectedRoute><TimeAttackQuiz /></ProtectedRoute>} />
            <Route path="/space-academy" element={<ProtectedRoute><SpaceAcademy /></ProtectedRoute>} />
            <Route path="/parent" element={<ProtectedRoute><ParentZone /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AccessibilitySettings /></ProtectedRoute>} />
            <Route path="/planet-smash" element={<ProtectedRoute><PlanetSmash /></ProtectedRoute>} />
            <Route path="/certificate" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><AccountDashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      <WelcomeTutorial />
    </div>
    <Celebration />
    <LaunchCinematic />
    <Mascot />
    <GameAudio />
    <AskAIChat />
    <UsageTracker />
  </>;
}

export default function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>;
}
