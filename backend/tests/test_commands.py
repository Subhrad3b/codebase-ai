from backend.app.api.routes import command_query


def test_slash_commands_direct_retrieval():
    query, intent = command_query("/find authenticate_user")
    assert query == "authenticate_user"
    assert "exact symbol" in intent


def test_plain_query_unchanged():
    assert command_query("where is auth?") == ("where is auth?", "where is auth?")
