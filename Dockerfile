# PARADOX Space Academy – builds the frontend and serves it with the backend.
# Project code is in PARADOX_GAME/; the updated files at the repo root are placed
# into their correct folders below.

FROM node:22-slim AS web
WORKDIR /app
COPY PARADOX_GAME/frontend/ frontend/
COPY AdvancedDashboard.jsx BranchingMission.jsx Home.jsx MissionDebrief.jsx SolarStorm.jsx frontend/src/pages/
COPY AuthContext.jsx frontend/src/context/
COPY CopilotPanel.jsx frontend/src/components/
COPY aiMissionApi.js tutorApi.js frontend/src/services/
WORKDIR /app/frontend
RUN npm ci
ENV VITE_API_BASE_URL=same-origin
RUN npm run build

FROM python:3.13-slim
WORKDIR /app
COPY PARADOX_GAME/backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY PARADOX_GAME/backend/ backend/
COPY main.py backend/main.py
COPY --from=web /app/frontend/dist frontend/dist
ENV PARADOX_DB_PATH=/app/data/paradox_accounts.sqlite3 PYTHONUNBUFFERED=1
RUN mkdir -p /app/data
WORKDIR /app/backend
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
