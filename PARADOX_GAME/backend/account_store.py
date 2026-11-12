"""SQLite-backed local accounts and player progress for PARADOX."""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

LEGACY_DB_PATH = Path(__file__).with_name("paradox_accounts.sqlite3")
if os.getenv("PARADOX_DB_PATH"):
    DB_PATH = Path(os.environ["PARADOX_DB_PATH"]).expanduser()
elif os.getenv("LOCALAPPDATA"):
    DB_PATH = Path(os.environ["LOCALAPPDATA"]) / "PARADOX" / "paradox_accounts.sqlite3"
else:
    DB_PATH = Path.home() / ".local" / "share" / "PARADOX" / "paradox_accounts.sqlite3"
PBKDF2_ITERATIONS = 310_000
TOKEN_DAYS = 90


def _connect():
    connection = sqlite3.connect(DB_PATH, timeout=15)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def _backup_existing_database():
    """Keep one dated SQLite backup per day before schema/data changes."""
    if not DB_PATH.exists() or DB_PATH.stat().st_size == 0:
        return
    backup_dir = DB_PATH.parent / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backup_dir / f"paradox-{datetime.now().strftime('%Y-%m-%d')}.sqlite3"
    if backup_path.exists():
        return
    source = sqlite3.connect(DB_PATH, timeout=15)
    target = sqlite3.connect(backup_path)
    try:
        source.backup(target)
    finally:
        target.close()
        source.close()


def _user_count(database: Path) -> int:
    """Return the number of accounts in a candidate SQLite database."""
    try:
        if not database.is_file() or database.stat().st_size < 100:
            return 0
        connection = sqlite3.connect(f"file:{database.as_posix()}?mode=ro", uri=True, timeout=3)
        try:
            exists = connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='users'"
            ).fetchone()
            if not exists:
                return 0
            return int(connection.execute("SELECT COUNT(*) FROM users").fetchone()[0])
        finally:
            connection.close()
    except (OSError, sqlite3.Error, ValueError):
        return 0


def _legacy_database_candidates():
    """Find earlier project-local databases after users extract a newer ZIP.

    Search only familiar PARADOX/NASA-Game project folders in common user
    folders. This avoids scanning the whole disk or unrelated SQLite files.
    """
    candidates = [LEGACY_DB_PATH]

    # Do not scan real user folders when tests or another caller temporarily
    # override DB_PATH to a disposable database.
    if os.getenv("PARADOX_DB_PATH"):
        expected_path = Path(os.environ["PARADOX_DB_PATH"]).expanduser()
    elif os.getenv("LOCALAPPDATA"):
        expected_path = Path(os.environ["LOCALAPPDATA"]) / "PARADOX" / "paradox_accounts.sqlite3"
    else:
        expected_path = Path.home() / ".local" / "share" / "PARADOX" / "paradox_accounts.sqlite3"
    try:
        if DB_PATH.resolve() != expected_path.resolve():
            return candidates
    except OSError:
        return candidates

    home = Path.home()
    search_bases = [
        home / "Downloads",
        home / "Desktop",
        home / "Documents",
    ]

    # Also search alongside the currently extracted project, if it is in a
    # parent folder that contains older PARADOX extracts.
    try:
        search_bases.append(Path(__file__).resolve().parents[2].parent)
    except IndexError:
        pass

    seen = set()
    for base in search_bases:
        try:
            if not base.is_dir():
                continue
            for project_dir in base.iterdir():
                if not project_dir.is_dir():
                    continue
                name = project_dir.name.lower()
                if "paradox" not in name and "nasa-game" not in name and "nasa_game" not in name:
                    continue

                # Search no more than six levels below the named project folder.
                for current, dirs, filenames in os.walk(project_dir):
                    current_path = Path(current)
                    try:
                        depth = len(current_path.relative_to(project_dir).parts)
                    except ValueError:
                        depth = 99
                    dirs[:] = [
                        d for d in dirs
                        if d.lower() not in {
                            "node_modules", ".venv", ".git", "__pycache__",
                            "dist", "build", ".vite", "backups"
                        }
                    ]
                    if depth >= 6:
                        dirs[:] = []
                    if "paradox_accounts.sqlite3" in filenames and current_path.name.lower() == "backend":
                        candidates.append(current_path / "paradox_accounts.sqlite3")
        except (OSError, PermissionError):
            continue

    unique = []
    for candidate in candidates:
        try:
            resolved = candidate.resolve()
        except OSError:
            resolved = candidate
        if resolved not in seen and resolved != DB_PATH.resolve():
            seen.add(resolved)
            unique.append(candidate)
    return unique


def _migrate_previous_account_database():
    """Copy an older project-local account DB into the stable user-data path.

    Existing accounts in the persistent database always win. If it is empty,
    migrate the newest valid previous project database that contains users.
    """
    current_users = _user_count(DB_PATH)
    if current_users:
        return None

    valid = []
    for candidate in _legacy_database_candidates():
        count = _user_count(candidate)
        if count:
            try:
                valid.append((candidate.stat().st_mtime, candidate, count))
            except OSError:
                continue

    if not valid:
        return None

    # The most recently modified valid DB is usually the player's latest save.
    _, source_path, count = max(valid, key=lambda item: item[0])
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = DB_PATH.with_name(DB_PATH.name + ".migrating")
    try:
        source = sqlite3.connect(f"file:{source_path.as_posix()}?mode=ro", uri=True, timeout=10)
        target = sqlite3.connect(temporary, timeout=10)
        try:
            source.backup(target)
        finally:
            target.close()
            source.close()
        os.replace(temporary, DB_PATH)
        print(
            f"[PARADOX] Restored {count} existing account(s) from "
            f"the previous project database: {source_path}"
        )
        return source_path
    except (OSError, sqlite3.Error) as error:
        try:
            temporary.unlink(missing_ok=True)
        except OSError:
            pass
        print(f"[PARADOX] Previous account database migration skipped: {error}")
        return None


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    # Keep the current project-local DB as the first migration candidate, then
    # look in older extracted PARADOX folders if the persistent DB is empty.
    _migrate_previous_account_database()
    _backup_existing_database()
    with _connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL COLLATE NOCASE UNIQUE,
                email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                display_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS auth_tokens (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS mission_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                session_id TEXT NOT NULL,
                mission_id INTEGER NOT NULL,
                mission_title TEXT NOT NULL,
                scenario_id INTEGER NOT NULL,
                scenario_name TEXT NOT NULL,
                difficulty TEXT NOT NULL,
                status TEXT NOT NULL,
                correct_decisions INTEGER NOT NULL DEFAULT 0,
                xp INTEGER NOT NULL DEFAULT 0,
                completed_at TEXT NOT NULL,
                UNIQUE(user_id, session_id)
            );
            CREATE INDEX IF NOT EXISTS idx_history_user ON mission_history(user_id, completed_at DESC);
            CREATE TABLE IF NOT EXISTS quiz_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                score INTEGER NOT NULL,
                total_questions INTEGER NOT NULL DEFAULT 10,
                difficulty TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                elapsed_seconds INTEGER NOT NULL DEFAULT 120,
                xp INTEGER NOT NULL DEFAULT 0,
                completed_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_quiz_user ON quiz_history(user_id, completed_at DESC);
            CREATE TABLE IF NOT EXISTS legacy_database_imports (
                source_path TEXT PRIMARY KEY,
                source_mtime_ns INTEGER NOT NULL,
                imported_at TEXT NOT NULL
            );
            """
        )
        columns = {row[1] for row in db.execute("PRAGMA table_info(users)").fetchall()}
        if "avatar_data_url" not in columns:
            db.execute("ALTER TABLE users ADD COLUMN avatar_data_url TEXT")

    # Also merge accounts/history from older extracted folders when a newer
    # project has already created a different local account.
    _merge_previous_account_databases()


def _merge_previous_account_databases():
    """Merge non-conflicting users and their progress from old project folders.

    The current persistent database is never overwritten. Accounts with a
    matching username AND email are treated as the same player; conflicting
    identities are skipped rather than having their credentials replaced.
    """
    try:
        current_path = DB_PATH.resolve()
    except OSError:
        current_path = DB_PATH

    for candidate in _legacy_database_candidates():
        try:
            source_path = candidate.resolve()
            if source_path == current_path or not source_path.is_file():
                continue
            source_mtime = source_path.stat().st_mtime_ns
        except OSError:
            continue

        if _user_count(source_path) == 0:
            continue

        source = None
        try:
            source = sqlite3.connect(
                f"file:{source_path.as_posix()}?mode=ro",
                uri=True,
                timeout=10,
            )
            source.row_factory = sqlite3.Row
            source_tables = {
                row[0] for row in source.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).fetchall()
            }
            if "users" not in source_tables:
                continue

            with _connect() as target:
                imported = target.execute(
                    "SELECT source_mtime_ns FROM legacy_database_imports WHERE source_path=?",
                    (str(source_path),),
                ).fetchone()
                if imported and int(imported["source_mtime_ns"]) == source_mtime:
                    continue

                target_user_columns = {
                    row[1] for row in target.execute("PRAGMA table_info(users)").fetchall()
                }
                source_user_columns = {
                    row[1] for row in source.execute("PRAGMA table_info(users)").fetchall()
                }
                user_fields = [
                    field for field in (
                        "username", "email", "display_name", "password_hash",
                        "password_salt", "created_at", "avatar_data_url",
                    )
                    if field in source_user_columns and field in target_user_columns
                ]

                user_id_map = {}
                source_users = source.execute("SELECT * FROM users ORDER BY id").fetchall()
                for old_user in source_users:
                    username = old_user["username"]
                    email = old_user["email"]
                    by_username = target.execute(
                        "SELECT id FROM users WHERE username=? COLLATE NOCASE",
                        (username,),
                    ).fetchone()
                    by_email = target.execute(
                        "SELECT id FROM users WHERE email=? COLLATE NOCASE",
                        (email,),
                    ).fetchone()

                    if by_username and by_email:
                        if int(by_username["id"]) == int(by_email["id"]):
                            new_user_id = int(by_username["id"])
                        else:
                            continue
                    elif by_username or by_email:
                        continue
                    else:
                        values = [old_user[field] for field in user_fields]
                        placeholders = ",".join("?" for _ in user_fields)
                        field_sql = ",".join(f'"{field}"' for field in user_fields)
                        cursor = target.execute(
                            f"INSERT INTO users ({field_sql}) VALUES ({placeholders})",
                            values,
                        )
                        new_user_id = int(cursor.lastrowid)

                    user_id_map[int(old_user["id"])] = new_user_id

                if "auth_tokens" in source_tables:
                    token_columns = {
                        row[1] for row in source.execute("PRAGMA table_info(auth_tokens)").fetchall()
                    }
                    if {"token_hash", "user_id", "expires_at", "created_at"}.issubset(token_columns):
                        for old_token in source.execute("SELECT * FROM auth_tokens").fetchall():
                            new_user_id = user_id_map.get(int(old_token["user_id"]))
                            if new_user_id is None:
                                continue
                            target.execute(
                                "INSERT OR IGNORE INTO auth_tokens(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)",
                                (
                                    old_token["token_hash"], new_user_id,
                                    old_token["expires_at"], old_token["created_at"],
                                ),
                            )

                for table in ("mission_history", "quiz_history"):
                    if table not in source_tables:
                        continue
                    source_columns = {
                        row[1] for row in source.execute(f'PRAGMA table_info("{table}")').fetchall()
                    }
                    target_columns = {
                        row[1] for row in target.execute(f'PRAGMA table_info("{table}")').fetchall()
                    }
                    transferable = [
                        field for field in source_columns.intersection(target_columns)
                        if field not in {"id", "user_id"}
                    ]
                    for old_record in source.execute(f'SELECT * FROM "{table}"').fetchall():
                        new_user_id = user_id_map.get(int(old_record["user_id"]))
                        if new_user_id is None:
                            continue
                        record_values = [old_record[field] for field in transferable]
                        if table == "quiz_history" and transferable:
                            match_clause = " AND ".join(f'"{field}" IS ?' for field in transferable)
                            existing_record = target.execute(
                                f'SELECT 1 FROM quiz_history WHERE user_id=? AND {match_clause} LIMIT 1',
                                [new_user_id, *record_values],
                            ).fetchone()
                            if existing_record:
                                continue

                        fields = ["user_id", *transferable]
                        values = [new_user_id, *record_values]
                        field_sql = ",".join(f'"{field}"' for field in fields)
                        placeholders = ",".join("?" for _ in fields)
                        target.execute(
                            f'INSERT OR IGNORE INTO "{table}" ({field_sql}) VALUES ({placeholders})',
                            values,
                        )

                target.execute(
                    "INSERT OR REPLACE INTO legacy_database_imports(source_path,source_mtime_ns,imported_at) VALUES(?,?,?)",
                    (str(source_path), source_mtime, _now()),
                )
        except (OSError, sqlite3.Error, KeyError, ValueError) as error:
            print(f"[PARADOX] Could not merge old account data from {source_path}: {error}")
        finally:
            if source is not None:
                source.close()


def _now():
    return datetime.now(timezone.utc).isoformat()


def _public_user(row):
    return {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "display_name": row["display_name"],
        "created_at": row["created_at"],
        "avatar_data_url": row["avatar_data_url"] if "avatar_data_url" in row.keys() else None,
    }


def _hash_password(password: str, salt: bytes) -> str:
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return digest.hex()


def _new_token(db, user_id: int):
    token = secrets.token_urlsafe(48)
    now = datetime.now(timezone.utc)
    expires = (now + timedelta(days=TOKEN_DAYS)).isoformat()
    db.execute(
        "INSERT INTO auth_tokens(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)",
        (hashlib.sha256(token.encode()).hexdigest(), user_id, expires, now.isoformat()),
    )
    return token


def register_user(username: str, email: str, display_name: str, password: str):
    username = username.strip()
    email = email.strip().lower()
    display_name = display_name.strip()
    salt = secrets.token_bytes(16)
    password_hash = _hash_password(password, salt)
    try:
        with _connect() as db:
            cursor = db.execute(
                "INSERT INTO users(username,email,display_name,password_hash,password_salt,created_at) VALUES(?,?,?,?,?,?)",
                (username, email, display_name, password_hash, salt.hex(), _now()),
            )
            user_id = cursor.lastrowid
            token = _new_token(db, user_id)
            row = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
            return token, _public_user(row)
    except sqlite3.IntegrityError as exc:
        message = str(exc).lower()
        if "username" in message:
            raise ValueError("That username is already registered.") from exc
        if "email" in message:
            raise ValueError("That email is already registered.") from exc
        raise ValueError("Could not create this account.") from exc


def login_user(email_or_username: str, password: str):
    identity = email_or_username.strip()
    with _connect() as db:
        row = db.execute(
            "SELECT * FROM users WHERE email=? OR username=?",
            (identity.lower(), identity),
        ).fetchone()
        if not row:
            raise ValueError("Incorrect email/username or password.")
        expected = _hash_password(password, bytes.fromhex(row["password_salt"]))
        if not hmac.compare_digest(expected, row["password_hash"]):
            raise ValueError("Incorrect email/username or password.")
        token = _new_token(db, row["id"])
        return token, _public_user(row)


def verify_user_password(user_id: int, password: str) -> bool:
    with _connect() as db:
        row = db.execute(
            "SELECT password_hash, password_salt FROM users WHERE id=?",
            (user_id,),
        ).fetchone()
    if not row:
        return False
    expected = _hash_password(password, bytes.fromhex(row["password_salt"]))
    return hmac.compare_digest(expected, row["password_hash"])


def get_user_for_token(token: str):
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    now = _now()
    with _connect() as db:
        row = db.execute(
            "SELECT users.* FROM auth_tokens JOIN users ON users.id=auth_tokens.user_id "
            "WHERE auth_tokens.token_hash=? AND auth_tokens.expires_at>?",
            (token_hash, now),
        ).fetchone()
        return _public_user(row) if row else None


def revoke_token(token: str):
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    with _connect() as db:
        db.execute("DELETE FROM auth_tokens WHERE token_hash=?", (token_hash,))


def record_completed_session(user_id: int, session: dict):
    if session.get("status") == "ACTIVE":
        raise ValueError("Complete the mission before saving it to your history.")
    correct = sum(1 for item in session.get("history", []) if item.get("correct"))
    status = session.get("status", "FAILURE")
    xp = (100 if status == "SUCCESS" else 35) + correct * 10
    completed_at = _now()
    with _connect() as db:
        db.execute(
            """INSERT OR IGNORE INTO mission_history
            (user_id,session_id,mission_id,mission_title,scenario_id,scenario_name,difficulty,status,correct_decisions,xp,completed_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
            (
                user_id, session["session_id"], session["mission_id"],
                session.get("mission_title", "Mission"), session["scenario_id"],
                session.get("scenario_name", "Scenario"), session.get("difficulty", "Easy"),
                status, correct, xp, completed_at,
            ),
        )
        row = db.execute(
            "SELECT * FROM mission_history WHERE user_id=? AND session_id=?",
            (user_id, session["session_id"]),
        ).fetchone()
        return dict(row)


def update_profile_photo(user_id: int, photo_data_url: str):
    with _connect() as db:
        db.execute("UPDATE users SET avatar_data_url=? WHERE id=?", (photo_data_url, user_id))
        row = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        if not row:
            raise ValueError("Player account not found.")
        return _public_user(row)


def record_quiz_result(user_id: int, score: int, total_questions: int, difficulty: str, completed: bool, elapsed_seconds: int):
    if total_questions != 10 or not 0 <= score <= total_questions:
        raise ValueError("Invalid quiz score.")
    if difficulty not in {"Easy", "Medium", "Hard"}:
        raise ValueError("Invalid quiz difficulty.")
    if not 0 <= elapsed_seconds <= 120:
        raise ValueError("Invalid quiz duration.")
    multiplier = {"Easy": 1.0, "Medium": 1.5, "Hard": 2.0}[difficulty]
    xp = round(score * 10 * multiplier) + (50 if completed and score == 10 else 0)
    with _connect() as db:
        cursor = db.execute(
            "INSERT INTO quiz_history(user_id,score,total_questions,difficulty,completed,elapsed_seconds,xp,completed_at) VALUES(?,?,?,?,?,?,?,?)",
            (user_id, score, total_questions, difficulty, int(completed), elapsed_seconds, xp, _now()),
        )
        row = db.execute("SELECT * FROM quiz_history WHERE id=?", (cursor.lastrowid,)).fetchone()
        return dict(row)


def account_summary(user: dict):
    with _connect() as db:
        rows = db.execute(
            "SELECT * FROM mission_history WHERE user_id=? ORDER BY completed_at DESC",
            (user["id"],),
        ).fetchall()
        quiz_rows = db.execute(
            "SELECT * FROM quiz_history WHERE user_id=? ORDER BY completed_at DESC",
            (user["id"],),
        ).fetchall()

    history = [dict(row) for row in rows]
    quiz_history = [dict(row) for row in quiz_rows]
    successes = sum(1 for row in history if row["status"] == "SUCCESS")
    xp = sum(row["xp"] for row in history) + sum(row["xp"] for row in quiz_history)
    unique_missions = len({row["mission_id"] for row in history})

    # Planet progression is scenario-based: finish all scenarios on one world
    # before the next planet unlocks. A successful retry never removes progress.
    from missions import MISSIONS

    successful_by_mission = {}
    for row in history:
        if row["status"] == "SUCCESS":
            successful_by_mission.setdefault(int(row["mission_id"]), set()).add(int(row["scenario_id"]))

    unlocked_mission_ids = {1}
    planet_progress = []
    previous_planet_complete = True
    current_mission_id = None

    for mission in MISSIONS:
        mission_id = int(mission["id"])
        scenario_ids = [int(scenario["id"]) for scenario in mission.get("scenarios", [])]
        completed_ids = successful_by_mission.get(mission_id, set())
        planet_unlocked = mission_id == 1 or previous_planet_complete
        if planet_unlocked:
            unlocked_mission_ids.add(mission_id)

        # Once a planet is unlocked, let the player choose any of its
        # adventures in any order. The next planet still requires all three
        # adventures on the current planet to be completed successfully.
        unlocked_scenarios = list(scenario_ids) if planet_unlocked else []

        planet_complete = bool(scenario_ids) and all(sid in completed_ids for sid in scenario_ids)
        if planet_unlocked and not planet_complete and current_mission_id is None:
            current_mission_id = mission_id

        planet_progress.append({
            "mission_id": mission_id,
            "planet_name": mission.get("title", f"World {mission_id}"),
            "unlocked": planet_unlocked,
            "completed": planet_complete,
            "completed_scenarios": len(completed_ids.intersection(scenario_ids)),
            "total_scenarios": len(scenario_ids),
            "unlocked_scenario_ids": unlocked_scenarios,
            "completed_scenario_ids": sorted(completed_ids.intersection(scenario_ids)),
        })
        previous_planet_complete = planet_complete

    beyond_neptune_unlocked = bool(planet_progress) and planet_progress[-1]["completed"]
    if beyond_neptune_unlocked:
        current_mission_id = None

    best_quiz_score = max((row["score"] for row in quiz_history), default=0)
    achievements = [
        {"id": "first-launch", "name": "First Launch", "description": "Complete your first mission.", "icon": "rocket", "unlocked": len(history) >= 1},
        {"id": "mission-saver", "name": "Mission Saver", "description": "Successfully complete a mission.", "icon": "shield", "unlocked": successes >= 1},
        {"id": "space-explorer", "name": "Space Explorer", "description": "Explore three different mission worlds.", "icon": "orbit", "unlocked": unique_missions >= 3},
        {"id": "five-missions", "name": "Star Collector", "description": "Complete five mission attempts.", "icon": "star", "unlocked": len(history) >= 5},
        {"id": "solar-guardian", "name": "Solar Guardian", "description": "Successfully complete the Solar Storm mission.", "icon": "sun", "unlocked": any(r["mission_id"] == 3 and r["status"] == "SUCCESS" for r in history)},
        {"id": "perfect-decisions", "name": "Careful Commander", "description": "Make three correct decisions in one mission.", "icon": "award", "unlocked": any(r["correct_decisions"] >= 3 for r in history)},
        {"id": "planet-hopper", "name": "Planet Hopper", "description": "Unlock your third planet.", "icon": "orbit", "unlocked": len(unlocked_mission_ids) >= 3},
        {"id": "neptune-pioneer", "name": "Neptune Pioneer", "description": "Complete every Neptune adventure.", "icon": "star", "unlocked": beyond_neptune_unlocked},
        {"id": "speed-scholar", "name": "Cosmic Speed Scholar", "description": "Finish the 10-question quiz before time runs out.", "icon": "award", "unlocked": any(row["completed"] for row in quiz_history)},
    ]
    return {
        "user": user,
        "stats": {
            "missions_attempted": len(history),
            "missions_successful": successes,
            "unique_mission_worlds": unique_missions,
            "xp": xp,
            "achievement_count": sum(1 for a in achievements if a["unlocked"]),
            "quiz_attempts": len(quiz_history),
            "quiz_best_score": best_quiz_score,
        },
        "achievements": achievements,
        "history": history,
        "quiz_history": quiz_history,
        "progression": {
            "planets": planet_progress,
            "unlocked_mission_ids": sorted(unlocked_mission_ids),
            "current_mission_id": current_mission_id,
            "beyond_neptune_unlocked": beyond_neptune_unlocked,
        },
    }


init_db()
