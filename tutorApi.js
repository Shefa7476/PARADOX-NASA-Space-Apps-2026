import { authFetch } from "./api";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL === "same-origin" ? "" : (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"));
export const ASK_AI_EVENT = "paradox:ask-ai";

/** Open the AI Co-Pilot chat from anywhere, optionally with mission context and a first question. */
export function openAskAI(context = {}, prompt = "", mode = "chat") {
  window.dispatchEvent(new CustomEvent(ASK_AI_EVENT, { detail: { context, prompt, mode } }));
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

export async function getTutorStatus() {
  const response = await authFetch(`${API_BASE_URL}/api/tutor/status`);
  const data = await readJson(response);
  if (!response.ok) throw new Error(data.detail || "Could not reach the AI Co-Pilot.");
  return data;
}

export async function askTutor({ messages, context, mode = "chat", language = "en", signal }) {
  let response;
  try {
    response = await authFetch(`${API_BASE_URL}/api/tutor/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, context, mode, language }),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error("Zippy can't reach mission control. Check that the backend is running, then try again.");
  }
  const data = await readJson(response);
  if (response.status === 429) throw new Error(data.detail || "Zippy needs a short break. Try again in a minute.");
  if (response.status === 401) throw new Error("Please log in again to chat with Zippy.");
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Zippy couldn't answer that. Please try again.");
  return data;
}
