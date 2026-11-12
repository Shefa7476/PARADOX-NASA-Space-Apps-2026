import account_store


def test_parent_password_verification(tmp_path, monkeypatch):
    monkeypatch.setattr(account_store, "DB_PATH", tmp_path / "paradox-test.sqlite3")
    account_store.init_db()
    token, user = account_store.register_user(
        "family_explorer", "guardian@example.test", "Star Explorer", "safe-parent-pass-123"
    )
    assert token
    assert account_store.verify_user_password(user["id"], "safe-parent-pass-123") is True
    assert account_store.verify_user_password(user["id"], "wrong-password-123") is False


def test_account_database_uses_persistent_user_data_location():
    # The path must not depend on the folder where the ZIP is extracted.
    if account_store.os.getenv("PARADOX_DB_PATH"):
        assert account_store.DB_PATH == account_store.Path(account_store.os.environ["PARADOX_DB_PATH"]).expanduser()
    elif account_store.os.getenv("LOCALAPPDATA"):
        assert "PARADOX" in str(account_store.DB_PATH)
        assert account_store.DB_PATH.name == "paradox_accounts.sqlite3"
