from __future__ import annotations

import json
from typing import List


def build_grading_messages(document_text: str, rubric_json: dict, rubric_id: str, user_instruction: str | None = None) -> List[dict]:
    rubric_compact = json.dumps(rubric_json, ensure_ascii=False)
    instruction = user_instruction or ""
    return [
        {
            "role": "system",
            "content": (
                "You are a strict rubric grader. Return JSON only. Do not reveal chain-of-thought. "
                "Use short rubric-anchored justifications only. For each criterion provide 1-2 direct quotes from the document, "
                "each quote no more than 25 words. If evidence is missing, set score=1 and explain what is missing. "
                "Do not compute category totals, overall score, or letter grade."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Rubric ID: {rubric_id}\n"
                f"Rubric JSON: {rubric_compact}\n\n"
                "Return a JSON object with fields: \n"
                "criteria: [{criterion_id, score (1-4 int), label, evidence_quotes (1-2), justification (2-4 sentences)}],\n"
                "summary_strengths (2-4 bullets), priority_revisions (2-4 bullets), confidence (0-100).\n"
                f"Additional grader instruction: {instruction}\n\n"
                f"Document:\n{document_text}"
            ),
        },
    ]


def build_edit_messages(document_text: str, instruction: str | None = None) -> List[dict]:
    instruction = instruction or "Focus on high-impact grammar and clarity issues."
    return [
        {
            "role": "system",
            "content": (
                "You are a writing editor. Return JSON only. Do not provide chain-of-thought. "
                "Return concise edits with grammar/clarity reasons."
            ),
        },
        {
            "role": "user",
            "content": (
                "Return JSON object with fields: edits (list of {original, suggested, reason}) and top_5_writing_fixes (list).\n"
                f"Instruction: {instruction}\n\n"
                f"Document:\n{document_text}"
            ),
        },
    ]


def build_followup_messages(
    document_text: str,
    rubric_json: dict,
    grading_result: dict,
    question: str,
    prior_messages: List[dict],
) -> List[dict]:
    rubric_compact = json.dumps(rubric_json, ensure_ascii=False)
    grading_compact = json.dumps(grading_result, ensure_ascii=False)
    return [
        {
            "role": "system",
            "content": (
                "You answer follow-up questions about an existing grading result. Keep score consistency unless user explicitly asks to re-grade. "
                "Do not provide chain-of-thought. Provide concise answers with direct document citations as quotes <=25 words. "
                "Return JSON only with fields: answer, citations (list), consistency_note."
            ),
        },
        *prior_messages[-8:],
        {
            "role": "user",
            "content": (
                f"Question: {question}\n\n"
                f"Document:\n{document_text}\n\n"
                f"Rubric:\n{rubric_compact}\n\n"
                f"Existing grading result (authoritative unless re-grade requested):\n{grading_compact}"
            ),
        },
    ]


def build_fix_json_messages(schema_name: str, raw_payload: str, validation_error: str) -> List[dict]:
    return [
        {
            "role": "system",
            "content": "Fix invalid JSON to match the required schema exactly. Return JSON only.",
        },
        {
            "role": "user",
            "content": (
                f"Schema target: {schema_name}\n"
                f"Validation error: {validation_error}\n"
                "Please repair this JSON payload:\n"
                f"{raw_payload}"
            ),
        },
    ]
