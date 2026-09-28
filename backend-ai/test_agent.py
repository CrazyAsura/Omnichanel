import asyncio

from app.agents.agent_orchestrator import AgentOrchestrator


def test_document_reader_returns_local_sources():
    result = asyncio.run(AgentOrchestrator().execute(
        session_id="test-session",
        message="Resuma as regras",
        selected_docs=["politica-de-seguranca.md"],
    ))

    assert result["success"] is True
    assert result["session_id"] == "test-session"
    assert "politica-de-seguranca.md" in result["sources_consulted"]
    assert "simulada" in result["reply"]


def test_file_generator_returns_downloadable_content():
    result = asyncio.run(AgentOrchestrator().execute(
        session_id="test-session",
        message="Gere um resumo",
        agent_mode="Gerador de arquivos",
    ))

    assert result["generated_file"]["name"].endswith(".txt")
    assert result["generated_file"]["mime_type"] == "text/plain"
    assert result["generated_file"]["content"] == result["reply"]
