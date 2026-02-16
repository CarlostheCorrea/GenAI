from __future__ import annotations

from typing import List


def clamp_quote_words(text: str, max_words: int = 25) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words])


def sanitize_quotes(quotes: List[str], max_quotes: int = 2, max_words: int = 25) -> List[str]:
    cleaned = [clamp_quote_words(q, max_words=max_words) for q in quotes if isinstance(q, str) and q.strip()]
    return cleaned[:max_quotes]
