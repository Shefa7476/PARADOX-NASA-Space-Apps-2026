from pathlib import Path
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from missions import MISSIONS
import httpx
from nasa_data import get_solar_flare_events
import logging
from logging.handlers import RotatingFileHandler
import os
from copilot import get_copilot_hint
import json
from io import BytesIO
from fastapi.responses import StreamingResponse
from debrief_engine import generate_debrief
from report_generator import generate_pdf_report
from ai_question_engine import generate_question, submit_answer
from nasa_explorer import get_space_dashboard, get_iss_position

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).with_name(".env"))
except Exception:
    pass

_log_dir = Path(__file__).with_name("logs")
_log_dir.mkdir(parents=True, exist_ok=True)
if not logging.getLogger().handlers:
    _handler = RotatingFileHandler(_log_dir / "paradox.log", maxBytes=1_000_000, backupCount=3, encoding="utf-8")
    _handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    logging.getLogger().addHandler(_handler)
    logging.getLogger().setLevel(logging.INFO)

app = FastAPI(title="PARADOX Game API")


class DecisionRequest(BaseModel):
    mission_id: int
    scenario_id: int
    action_id: str


def find_mission(mission_id):
    return next(
        (m for m in MISSIONS if m["id"] == mission_id),
        None
    )


def public_mission(mission):
    # Never expose correct_action to the player
    return {
        "id": mission["id"],
        "title": mission["title"],
        "category": mission["category"],
        "scenarios": [
            {
                "id": s["id"],
                "name": s["name"],
                "problem": s["problem"],
                "clues": s["clues"],
                "actions": s["actions"]
            }
            for s in mission["scenarios"]
        ]
    }


@app.get("/")
def home():
    # Live hosting: show the game itself when the built frontend is bundled.
    index = Path(__file__).resolve().parent.parent / "frontend" / "dist" / "index.html"
    if index.is_file():
        from fastapi.responses import FileResponse
        return FileResponse(index)
    return {"message": "PARADOX Backend Running"}


@app.get("/api/system/health")
def system_health():
    return {
        "app": "PARADOX",
        "build": "academy-round3-2026-11-11",
        "status": "ok",
    }


@app.get("/api/game")
def game_info():
    return {
        "name": "PARADOX",
        "total_missions": len(MISSIONS),
        "scenarios_per_mission": 3,
        "difficulty_levels": ["Easy", "Medium", "Hard"]
    }


@app.get("/api/missions")
def get_missions():
    return [public_mission(m) for m in MISSIONS]


@app.get("/api/missions/{mission_id}")
def get_mission(mission_id: int):
    mission = find_mission(mission_id)

    if not mission:
        raise HTTPException(404, "Mission not found")

    return public_mission(mission)


@app.post("/api/decision")
def evaluate_decision(request: DecisionRequest):
    mission = find_mission(request.mission_id)

    if not mission:
        raise HTTPException(404, "Mission not found")

    scenario = next(
        (
            s for s in mission["scenarios"]
            if s["id"] == request.scenario_id
        ),
        None
    )

    if not scenario:
        raise HTTPException(404, "Scenario not found")

    action = next(
        (
            a for a in scenario["actions"]
            if a["id"] == request.action_id
        ),
        None
    )

    if not action:
        raise HTTPException(400, "Invalid action")

    success = (
        request.action_id == scenario["correct_action"]
    )

    return {
        "success": success,
        "status": "SUCCESS" if success else "FAILURE",
        "message": (
            "Your decision resolved the primary mission problem."
            if success
            else "Your decision did not resolve the primary problem."
        ),
        "selected_action": action["label"],
        "explanation": (
            "This action addresses the failure indicated by the clues."
            if success
            else "Review the telemetry and try a different solution."
        )
    }
    
from simulation import (
    create_session,
    evaluate_action,
    get_session
)


class StartMissionRequest(BaseModel):
    mission_id: int
    scenario_id: int
    difficulty: str
    review: bool = False


class MissionActionRequest(BaseModel):
    session_id: str
    action_id: str


@app.post("/api/session/start")
async def start_mission(request: StartMissionRequest, http_request: Request):
    from question_engine import PoolExhausted
    from question_generator import ensure_pool

    player = getattr(http_request.state, "player", None)
    if player:
        progress = account_summary(player)["progression"]
        planet = next((item for item in progress["planets"] if item["mission_id"] == request.mission_id), None)
        if not planet or request.scenario_id not in planet["unlocked_scenario_ids"]:
            raise HTTPException(status_code=403, detail="Complete the previous adventure to unlock this mission.")
    try:
        if player and not request.review and request.difficulty in ("Easy", "Medium", "Hard"):
            try:
                await ensure_pool(player["id"], request.mission_id, request.scenario_id, request.difficulty)
            except Exception as error:  # generation is best-effort; never block play
                logger.warning("Question top-up failed: %s", error)
        return create_session(request.mission_id, request.scenario_id, request.difficulty,
                              user_id=player["id"] if player else None, review=request.review)
    except PoolExhausted as error:
        raise HTTPException(status_code=409, detail=error.info)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@app.get("/api/questions/availability")
def question_availability(mission_id: int, scenario_id: int, http_request: Request):
    from ai_tutor import ai_configured
    from question_engine import count_fresh
    player = getattr(http_request.state, "player", None)
    uid = player["id"] if player else None
    return {
        "mission_id": mission_id, "scenario_id": scenario_id, "ai_generation": ai_configured(),
        "fresh": {lvl: count_fresh(uid, mission_id, scenario_id, lvl) for lvl in ("Easy", "Medium", "Hard")},
    }


@app.get("/api/learning/insights")
def learning_insights_api(http_request: Request):
    from question_store import learning_insights
    player = getattr(http_request.state, "player", None)
    if not player:
        raise HTTPException(status_code=401, detail="Please log in.")
    return learning_insights(player["id"])


@app.post("/api/session/action")
def submit_mission_action(request: MissionActionRequest):
    try:
        return evaluate_action(
            request.session_id,
            request.action_id
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


@app.get("/api/session/{session_id}")
def read_mission_session(session_id: str):
    try:
        return get_session(session_id)
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )


logger = logging.getLogger(__name__)


@app.get("/api/nasa/solar-flares")
async def solar_flare_data():
    try:
        events = await get_solar_flare_events()

        return {
            "source": "NASA DONKI",
            "count": len(events),
            "events": events
        }

    except httpx.HTTPStatusError as error:
        logger.error(
            "NASA HTTP error: %s %s",
            error.response.status_code,
            error.response.text[:500]
        )

        raise HTTPException(
            status_code=503,
            detail="NASA API returned an HTTP error"
        )

    except httpx.RequestError as error:
        logger.error("NASA connection error: %s", error)

        raise HTTPException(
            status_code=503,
            detail="NASA API connection failed"
        )

    except ValueError as error:
        logger.error("NASA data error: %s", error)

        raise HTTPException(
            status_code=503,
            detail="NASA API returned invalid data"
        )

from advanced_engine import (
    start_advanced_session,
    execute_advanced_action
)


@app.post("/api/advanced/start")
def advanced_start(request: StartMissionRequest):
    try:
        return start_advanced_session(
            request.mission_id,
            request.scenario_id,
            request.difficulty
        )
    except ValueError as error:
        raise HTTPException(400, str(error))


@app.post("/api/advanced/action")
def advanced_action(request: MissionActionRequest):
    try:
        return execute_advanced_action(
            request.session_id,
            request.action_id
        )
    except ValueError as error:
        raise HTTPException(400, str(error))
    


from solar_storm import (
    start_solar_storm,
    execute_solar_action
)


class SolarStartRequest(BaseModel):
    difficulty: str
    event_id: str


class SolarActionRequest(BaseModel):
    session_id: str
    action_id: str


@app.post("/api/solar-storm/start")
async def solar_storm_start(request: SolarStartRequest):
    try:
        return await start_solar_storm(
            request.difficulty,
            request.event_id
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except (httpx.HTTPError, httpx.DecodingError):
        raise HTTPException(
            status_code=503,
            detail="NASA DONKI service is unavailable"
        )


@app.post("/api/solar-storm/action")
def solar_storm_action(request: SolarActionRequest):
    try:
        return execute_solar_action(
            request.session_id,
            request.action_id
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


from branching_engine import (
    start_branching_session,
    execute_branching_action,
    get_branching_session
)


class BranchingStartRequest(BaseModel):
    difficulty: str
    event_id: str


class BranchingActionRequest(BaseModel):
    session_id: str
    action_id: str

class GenerateQuestionRequest(BaseModel):
    mission_id: int
    difficulty: str
    event_id: str | None = None


class SubmitQuestionAnswerRequest(BaseModel):
    question_id: str
    action_id: str    


@app.post("/api/branching/start")
async def branching_start(request: BranchingStartRequest):
    try:
        return await start_branching_session(
            request.difficulty,
            request.event_id
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except httpx.HTTPError:
        raise HTTPException(
            status_code=503,
            detail="NASA DONKI service unavailable"
        )


@app.post("/api/branching/action")
def branching_action(request: BranchingActionRequest):
    try:
        return execute_branching_action(
            request.session_id,
            request.action_id
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


@app.get("/api/branching/session/{session_id}")
def branching_session_status(session_id: str):
    try:
        return get_branching_session(session_id)

    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )


class CopilotHintRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=100)
    question: str = Field(default="", max_length=500)


@app.post("/api/copilot/hint")
async def copilot_hint(request: CopilotHintRequest):
    try:
        return await get_copilot_hint(
            session_id=request.session_id,
            question=request.question
        )

    except ValueError as error:
        message = str(error)

        status = (
            429 if message == "Hint limit reached"
            else 400
        )

        raise HTTPException(
            status_code=status,
            detail=message
        )


@app.get("/api/debrief/{session_id}")
def get_mission_debrief(session_id: str):
    try:
        return generate_debrief(session_id)

    except ValueError as error:
        message = str(error)

        status = (
            404 if message == "Session not found"
            else 409
        )

        raise HTTPException(
            status_code=status,
            detail=message
        )


@app.get("/api/debrief/{session_id}/pdf")
def download_mission_pdf(session_id: str):
    try:
        debrief = generate_debrief(session_id)
        pdf_bytes = generate_pdf_report(debrief)

        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    'attachment; filename="'
                    'PARADOX_Mission_Report.pdf"'
                ),
                "Cache-Control": "no-store"
            }
        )

    except ValueError as error:
        message = str(error)

        raise HTTPException(
            status_code=(
                404 if message == "Session not found"
                else 409
            ),
            detail=message
        )


@app.get("/api/debrief/{session_id}/json")
def download_mission_json(session_id: str):
    try:
        debrief = generate_debrief(session_id)

        json_bytes = json.dumps(
            debrief,
            indent=2,
            ensure_ascii=False
        ).encode("utf-8")

        return StreamingResponse(
            BytesIO(json_bytes),
            media_type="application/json",
            headers={
                "Content-Disposition": (
                    'attachment; filename="'
                    'PARADOX_Mission_Report.json"'
                ),
                "Cache-Control": "no-store"
            }
        )

    except ValueError as error:
        message = str(error)

        raise HTTPException(
            status_code=(
                404 if message == "Session not found"
                else 409
            ),
            detail=message
        )
@app.post("/api/questions/generate")
async def api_generate_question(request: GenerateQuestionRequest):
    try:
        return await generate_question(
            mission_id=request.mission_id,
            difficulty=request.difficulty,
            event_id=request.event_id,
        )
    except ValueError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/questions/answer")
async def api_submit_question_answer(
    request: SubmitQuestionAnswerRequest,
):
    try:
        return submit_answer(
            question_id=request.question_id,
            action_id=request.action_id,
        )
    except ValueError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(exc))
    

@app.get("/api/nasa/iss-location")
async def nasa_iss_location():
    position = await get_iss_position()
    if not position:
        raise HTTPException(status_code=503, detail="ISS position is temporarily unavailable.")
    return position


@app.get("/api/nasa/space-dashboard")
async def nasa_space_dashboard():
    """Read-only NASA/ISS facts for the public Space Academy dashboard."""
    try:
        return await get_space_dashboard()
    except Exception as error:
        logger.exception("NASA space dashboard failed: %s", error)
        raise HTTPException(status_code=503, detail="Live space data is temporarily unavailable. Try again later.")


# ---------------------------------------------------------------------------
# Local player accounts and persistent progress
# ---------------------------------------------------------------------------
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from account_store import (
    account_summary,
    get_user_for_token,
    login_user,
    record_completed_session,
    register_user,
    revoke_token,
    record_quiz_result,
    verify_user_password,
)

bearer_scheme = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_]+$")
    email: str = Field(min_length=5, max_length=254)
    display_name: str = Field(min_length=2, max_length=60)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email_or_username: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class VerifyPasswordRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class RecordProgressRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=100)


class QuizResultRequest(BaseModel):
    score: int = Field(ge=0, le=10)
    total_questions: int = Field(default=10, ge=10, le=10)
    difficulty: str = Field(pattern=r"^(Easy|Medium|Hard)$")
    completed: bool
    elapsed_seconds: int = Field(ge=0, le=120)


def require_player(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Please log in.")
    user = get_user_for_token(credentials.credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Your session expired. Please log in again.")
    return user


@app.post("/api/auth/register")
def api_register(request: RegisterRequest):
    if "@" not in request.email or request.email.startswith("@") or request.email.endswith("@"):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    try:
        token, user = register_user(
            request.username, request.email, request.display_name, request.password
        )
        return {"access_token": token, "token_type": "bearer", "user": user}
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error))


@app.post("/api/auth/login")
def api_login(request: LoginRequest):
    try:
        token, user = login_user(request.email_or_username, request.password)
        return {"access_token": token, "token_type": "bearer", "user": user}
    except ValueError as error:
        raise HTTPException(status_code=401, detail=str(error))


@app.get("/api/auth/me")
def api_me(user: dict = Depends(require_player)):
    return {"user": user}


@app.post("/api/auth/logout")
def api_logout(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    if credentials and credentials.scheme.lower() == "bearer":
        revoke_token(credentials.credentials)
    return {"message": "Logged out."}


@app.get("/api/account/summary")
def api_account_summary(user: dict = Depends(require_player)):
    return account_summary(user)


@app.post("/api/auth/verify-password")
def api_verify_password(
    request: VerifyPasswordRequest,
    user: dict = Depends(require_player),
):
    if not verify_user_password(user["id"], request.password):
        raise HTTPException(status_code=401, detail="Password did not match. Ask your parent or guardian to try again.")
    return {"verified": True}


@app.post("/api/account/record")
def api_record_progress(
    request: RecordProgressRequest,
    user: dict = Depends(require_player),
):
    try:
        session = get_session(request.session_id)
        record = record_completed_session(user["id"], session)
        return {"record": record, "summary": account_summary(user)}
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error))


@app.post("/api/quiz/record")
def api_record_quiz(
    request: QuizResultRequest,
    user: dict = Depends(require_player),
):
    try:
        record = record_quiz_result(
            user["id"], request.score, request.total_questions,
            request.difficulty, request.completed, request.elapsed_seconds,
        )
        return {"record": record, "summary": account_summary(user)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))


# ---------------------------------------------------------------------------
# AI Co-Pilot tutor chat and question-bank info
# ---------------------------------------------------------------------------
from ai_tutor import RateLimited, TutorError, tutor_reply, tutor_status
from question_bank import bank_summary


class TutorMessage(BaseModel):
    role: str = Field(pattern=r"^(user|assistant)$")
    content: str = Field(min_length=1, max_length=1500)


class TutorContext(BaseModel):
    planet: str = Field(default="", max_length=30)
    mission: str = Field(default="", max_length=80)
    stage: str = Field(default="", max_length=80)
    difficulty: str = Field(default="", max_length=10)
    question: str = Field(default="", max_length=400)
    question_id: str = Field(default="", max_length=40)
    topic: str = Field(default="", max_length=120)
    answered: bool = False
    your_answer: str = Field(default="", max_length=200)
    correct_answer: str = Field(default="", max_length=200)
    explanation: str = Field(default="", max_length=600)


class TutorChatRequest(BaseModel):
    messages: list[TutorMessage] = Field(min_length=1, max_length=30)
    context: TutorContext = Field(default_factory=TutorContext)
    mode: str = Field(default="chat", pattern=r"^(chat|simpler|example|more|bangla|related|why)$")
    language: str = Field(default="en", pattern=r"^(en|bn)$")


@app.get("/api/tutor/status")
def api_tutor_status(user: dict = Depends(require_player)):
    return tutor_status()


@app.post("/api/tutor/chat")
async def api_tutor_chat(request: TutorChatRequest, user: dict = Depends(require_player)):
    try:
        return await tutor_reply(
            player_key=user["id"],
            messages=[m.model_dump() for m in request.messages],
            context=request.context.model_dump(),
            mode=request.mode,
            language=request.language,
        )
    except RateLimited as error:
        raise HTTPException(status_code=429, detail=str(error))
    except TutorError as error:
        raise HTTPException(status_code=400, detail=str(error))


@app.get("/api/questions/bank")
def api_question_bank_summary():
    return bank_summary()


from fastapi.responses import JSONResponse


@app.middleware("http")
async def protect_game_api(request, call_next):
    path = request.url.path
    public_paths = {"/api/game", "/api/auth/register", "/api/auth/login", "/api/nasa/space-dashboard", "/api/nasa/iss-location", "/api/system/health"}
    if request.method == "OPTIONS" or not path.startswith("/api/") or path in public_paths:
        return await call_next(request)
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")
    user = get_user_for_token(token) if scheme.lower() == "bearer" and token else None
    if not user:
        return JSONResponse(status_code=401, content={"detail": "Please log in."})
    request.state.player = user
    return await call_next(request)


# Keep CORS outermost so even authentication errors include browser CORS headers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"] + [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Live hosting: when the built frontend (frontend/dist) is present, serve it from
# this same server so the whole game runs at one public address.
# Registered last, so every /api route above keeps priority.
# ---------------------------------------------------------------------------
_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if (_DIST / "index.html").is_file():
    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (_DIST / full_path).resolve()
        if full_path and candidate.is_file() and _DIST.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(_DIST / "index.html")
