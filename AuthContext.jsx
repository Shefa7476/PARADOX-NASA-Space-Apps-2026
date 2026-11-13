import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AuthContext = createContext(null);
const API = (import.meta.env.VITE_API_BASE_URL === "same-origin" ? "" : (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"));
const TOKEN_KEY = "paradox_access_token";
const USER_KEY = "paradox_cached_user";

class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function readCachedUser() {
  try {
    const value = localStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    // A network failure is not proof that the account or token is invalid.
    throw new ApiError("Cannot connect to PARADOX server. Check that the backend is running.", 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail;
    const message = typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map((item) => item.msg || "Invalid request").join(", ")
        : "Request failed. Please try again.";
    throw new ApiError(message, response.status);
  }
  return data;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    return savedToken ? readCachedUser() : null;
  });
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    let active = true;

    if (!token) {
      setUser(null);
      setLoading(false);
      localStorage.removeItem(USER_KEY);
      return () => { active = false; };
    }

    // Keep the cached player visible while the backend validates the session.
    setLoading(true);
    request("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data) => {
        if (!active) return;
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      })
      .catch((error) => {
        if (!active) return;

        if (error.status === 401) {
          // Only an explicit Unauthorized response invalidates the session.
          clearSession();
          setToken("");
          setUser(null);
        } else {
          // Backend offline / timeout / 5xx: retain token and cached account.
          setUser(readCachedUser());
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [token]);

  const acceptAuth = useCallback(async (path, payload) => {
    const data = await request(path, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    saveSession(data.access_token, data.user);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(
    (payload) => acceptAuth("/api/auth/register", payload),
    [acceptAuth],
  );

  const login = useCallback(
    (payload) => acceptAuth("/api/auth/login", payload),
    [acceptAuth],
  );

  const logout = useCallback(async () => {
    const currentToken = token;
    try {
      if (currentToken) {
        await request("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      }
    } finally {
      clearSession();
      setToken("");
      setUser(null);
    }
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return null;
    try {
      const data = await request("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(data.user);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch (error) {
      if (error.status === 401) {
        clearSession();
        setToken("");
        setUser(null);
      }
      throw error;
    }
  }, [token]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    register,
    login,
    logout,
    refreshUser,
  }), [user, token, loading, register, login, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export { API as API_BASE_URL };
