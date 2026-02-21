from __future__ import annotations

import re
from typing import List


def clamp_quote_words(text: str, max_words: int = 25) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words])


def sanitize_quotes(quotes: List[str], max_quotes: int = 2, max_words: int = 25) -> List[str]:
    cleaned = [clamp_quote_words(q, max_words=max_words) for q in quotes if isinstance(q, str) and q.strip()]
    return cleaned[:max_quotes]


_NUMBER_WORDS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
}


def _requested_sentence_count(question: str) -> int | None:
    q = question.lower()
    digit_match = re.search(r"\b(\d+)\s*sentence(?:s)?\b", q)
    if digit_match:
        return max(1, int(digit_match.group(1)))
    word_match = re.search(r"\b(" + "|".join(_NUMBER_WORDS.keys()) + r")\s*sentence(?:s)?\b", q)
    if word_match:
        return _NUMBER_WORDS[word_match.group(1)]
    return None


def _split_sentences(text: str) -> List[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    cleaned = [p.strip() for p in parts if p and p.strip()]
    return cleaned


def enforce_followup_constraints(answer: str, question: str) -> str:
    if not isinstance(answer, str):
        return answer

    requested = _requested_sentence_count(question or "")
    if not requested:
        return answer.strip()

    sentences = _split_sentences(answer)
    if not sentences:
        return answer.strip()

    if len(sentences) >= requested:
        return " ".join(sentences[:requested]).strip()

    # If fewer sentences than requested, keep answer but normalize spacing.
    return " ".join(sentences).strip()
