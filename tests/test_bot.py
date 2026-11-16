import pytest

from bot import determine_category
from generate_data import parse_markdown_table_file


@pytest.mark.parametrize(
    ("topics", "desc", "expected"),
    [
        (["agentic-ai"], "", "Agents"),
        (["mcp"], "", "MCP & Tools"),
        ([], "A realtime distributed OLAP datastore", "Databases"),
        ([], "Object storage with average latency stats", "AI Tool"),  # no substring hits on rag/agent
        ([], "User-agent parser", "AI Tool"),
        (["vector-database"], "", "Vector DB"),
        (["rag"], "an agent framework", "RAG & Search"),  # topics beat description words
    ],
)
def test_determine_category(topics, desc, expected):
    assert determine_category({"topics": topics, "description": desc}) == expected


def test_category_has_no_emoji():
    assert determine_category({"topics": ["llm"]}).isascii()


def test_parse_both_row_formats(tmp_path):
    f = tmp_path / "log.md"
    f.write_text(
        "| 2026-01-01 | [a/b](https://github.com/a/b) | Go | Agents | desc | ⭐ 1,234 |\n"
        "| 2026-01-02 | [c/d](https://github.com/c/d) | Python | Agents | desc | 99 |\n"
        "| 2025-01-01 | [e/f](https://github.com/e/f) | legacy | 5 |\n",
        encoding="utf-8",
    )
    rows = parse_markdown_table_file(str(f))
    assert [r["stars"] for r in rows] == [1234, 99, 5]
    assert rows[2]["category"] == "AI Tool"
