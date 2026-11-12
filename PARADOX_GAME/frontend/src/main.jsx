import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyPreferences } from "./services/preferences";
import "./styles/accessibility.css";

// localStorage is scoped by hostname. Always use localhost for the local game
// so a player who previously opened 127.0.0.1 does not appear logged out.
const isLocalPreview =
  window.location.port === "5173" &&
  (window.location.hostname === "127.0.0.1" || window.location.hostname === "[::1]");

if (isLocalPreview) {
  const canonical = new URL(window.location.href);
  canonical.hostname = "localhost";
  window.location.replace(canonical.toString());
} else {
  applyPreferences();

  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => console.warn("PWA service worker unavailable:", error));
    });
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
