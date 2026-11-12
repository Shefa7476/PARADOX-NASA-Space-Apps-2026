
import { authFetch } from "./api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function postJSON(path, payload) {
  let response;

  try {
    response = await authFetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Backend connection failed. Check that FastAPI is running."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || `Request failed with status ${response.status}`
    );
  }

  return data;
}

export function generateMissionQuestion({
  missionId,
  difficulty,
  eventId = null,
}) {
  return postJSON("/api/questions/generate", {
    mission_id: Number(missionId),
    difficulty,
    ...(eventId ? { event_id: eventId } : {}),
  });
}

export function submitMissionAnswer({ questionId, actionId }) {
  return postJSON("/api/questions/answer", {
    question_id: questionId,
    action_id: actionId,
  });
}
