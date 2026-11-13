# PARADOX Space Academy: one container that builds the React frontend and serves
# it together with the FastAPI backend at a single public address (e.g. on Render).

# 1) Build the frontend
FROM node:22-slim AS web
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# "same-origin" makes the game call the API on the same address it is served from
ENV VITE_API_BASE_URL=same-origin
RUN npm run build

# 2) Run the backend and serve the built frontend
FROM python:3.13-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ backend/
COPY --from=web /app/frontend/dist frontend/dist
ENV PARADOX_DB_PATH=/app/data/paradox_accounts.sqlite3 \
    PYTHONUNBUFFERED=1
RUN mkdir -p /app/data
WORKDIR /app/backend
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
