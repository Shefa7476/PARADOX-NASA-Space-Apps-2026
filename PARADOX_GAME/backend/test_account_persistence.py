import account_store


def test_login_accepts_username_case_insensitively(tmp_path, monkeypatch):
    database = tmp_path / "accounts.sqlite3"
    monkeypatch.setattr(account_store, "DB_PATH", database)
    monkeypatch.setattr(account_store, "_legacy_database_candidates", lambda: [])
    account_store.init_db()

    token, user = account_store.register_user(
        "SpacePilot", "guardian@example.test", "Space Pilot", "correct-horse-123"
    )
    assert token
    login_token, logged_in = account_store.login_user("SPACEPILOT", "correct-horse-123")
    assert login_token
    assert logged_in["id"] == user["id"]


def test_previous_project_database_is_migrated(tmp_path, monkeypatch):
    old_database = tmp_path / "old-project" / "backend" / "paradox_accounts.sqlite3"
    new_database = tmp_path / "local-app-data" / "PARADOX" / "paradox_accounts.sqlite3"
    old_database.parent.mkdir(parents=True)
    monkeypatch.setattr(account_store, "DB_PATH", old_database)
    monkeypatch.setattr(account_store, "_legacy_database_candidates", lambda: [])
    account_store.init_db()
    account_store.register_user(
        "returning_explorer",
        "parent@example.test",
        "Returning Explorer",
        "guardian-password-123",
    )

    monkeypatch.setattr(account_store, "DB_PATH", new_database)
    monkeypatch.setattr(account_store, "LEGACY_DB_PATH", old_database)
    monkeypatch.setattr(account_store, "_legacy_database_candidates", lambda: [old_database])
    account_store.init_db()

    token, user = account_store.login_user("returning_explorer", "guardian-password-123")
    assert token
    assert user["username"] == "returning_explorer"
    assert account_store._user_count(new_database) == 1


def test_existing_persistent_accounts_are_never_overwritten(tmp_path, monkeypatch):
    old_database = tmp_path / "old" / "paradox_accounts.sqlite3"
    current_database = tmp_path / "current" / "paradox_accounts.sqlite3"

    monkeypatch.setattr(account_store, "DB_PATH", old_database)
    monkeypatch.setattr(account_store, "_legacy_database_candidates", lambda: [])
    account_store.init_db()
    account_store.register_user("old_player", "old@example.test", "Old", "old-password-123")

    monkeypatch.setattr(account_store, "DB_PATH", current_database)
    monkeypatch.setattr(account_store, "LEGACY_DB_PATH", old_database)
    monkeypatch.setattr(account_store, "_legacy_database_candidates", lambda: [])
    account_store.init_db()
    account_store.register_user("current_player", "current@example.test", "Current", "current-password-123")

    # A non-empty persistent DB must win over older project-local copies.
    monkeypatch.setattr(account_store, "_legacy_database_candidates", lambda: [old_database])
    account_store.init_db()
    assert account_store._user_count(current_database) == 2
    _, user = account_store.login_user("current_player", "current-password-123")
    assert user["username"] == "current_player"
    _, old_user = account_store.login_user("old_player", "old-password-123")
    assert old_user["username"] == "old_player"



def test_automatically_finds_old_database_in_previous_download_folder(tmp_path, monkeypatch):
    home = tmp_path / "profile"
    old_project = home / "Downloads" / "PARADOX_GAME_DOWNLOAD" / "PARADOX_GAME"
    old_database = old_project / "backend" / "paradox_accounts.sqlite3"
    local_data = home / "AppData" / "Local"
    persistent_database = local_data / "PARADOX" / "paradox_accounts.sqlite3"

    # Create the old project-local database and a returning player.
    real_candidate_scan = account_store._legacy_database_candidates
    monkeypatch.setattr(account_store, "DB_PATH", old_database)
    monkeypatch.setattr(account_store, "LEGACY_DB_PATH", old_database)
    monkeypatch.setattr(account_store, "_legacy_database_candidates", lambda: [])
    account_store.init_db()
    account_store.register_user(
        "saved_explorer", "parent@sample.test", "Saved Explorer", "saved-password-123"
    )

    # Simulate a new extracted ZIP on the same Windows profile.
    monkeypatch.setattr(account_store.Path, "home", classmethod(lambda cls: home))
    monkeypatch.setenv("LOCALAPPDATA", str(local_data))
    monkeypatch.delenv("PARADOX_DB_PATH", raising=False)
    monkeypatch.setattr(account_store, "DB_PATH", persistent_database)
    monkeypatch.setattr(account_store, "LEGACY_DB_PATH", home / "not-here" / "paradox_accounts.sqlite3")
    monkeypatch.setattr(account_store, "_legacy_database_candidates", real_candidate_scan)

    found = account_store._legacy_database_candidates()
    assert old_database in found

    account_store.init_db()
    token, user = account_store.login_user("saved_explorer", "saved-password-123")
    assert token
    assert user["username"] == "saved_explorer"
