from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List

logger = logging.getLogger(__name__)


RUBRIC_FILE_MAP = {
    "OtherCatMeta_updated.json": {
        "rubric_id": "college_cross_disciplinary_other_v1",
        "name": "OtherCatMeta_updated",
    },
    "NatSciMeta_updated.json": {
        "rubric_id": "essay_quality_v2",
        "name": "NatSciMeta_updated",
    },
    "phdMeta_updated.json": {
        "rubric_id": "phd_unified_meta_v3",
        "name": "phdMeta_updated",
    },
    "HumanSosMeta_updated.json": {
        "rubric_id": "college_humanities_social_sciences_meta_v2",
        "name": "HumanSosMeta_updated",
    },
}


class RubricLoader:
    def __init__(self, rubric_dir: Path):
        self.rubric_dir = rubric_dir
        self._rubrics: Dict[str, dict] = {}

    def load_all(self) -> Dict[str, dict]:
        loaded: Dict[str, dict] = {}
        for filename, meta in RUBRIC_FILE_MAP.items():
            path = self.rubric_dir / filename
            with path.open("r", encoding="utf-8") as f:
                raw = json.load(f)
            normalized = self._normalize_rubric(raw, meta)
            loaded[normalized["rubric_id"]] = normalized

        self._rubrics = loaded
        logger.info(
            "Startup rubric load complete. loaded_rubrics=%s",
            [{"rubric_id": r["rubric_id"], "name": r.get("name")} for r in loaded.values()],
        )
        return loaded

    @property
    def rubrics(self) -> Dict[str, dict]:
        return self._rubrics

    def _normalize_rubric(self, raw: dict, meta: dict) -> dict:
        norm = dict(raw)

        norm["rubric_id"] = raw.get("rubric_id", meta["rubric_id"])
        norm["name"] = raw.get("name", meta["name"])

        scale_labels = raw.get("scale_labels") or raw.get("scale", {}).get("labels")
        norm["scale_labels"] = scale_labels or {
            "1": "Beginning",
            "2": "Developing",
            "3": "Proficient",
            "4": "Advanced",
        }

        letter_map = raw.get("letter_grade_map") or raw.get("scoring", {}).get("letter_grade_map") or []
        norm["letter_grade_map"] = self._normalize_letter_grade_map(letter_map)
        return norm

    def _normalize_letter_grade_map(self, rows: List[dict]) -> List[dict]:
        normalized: List[dict] = []
        for row in rows:
            if "min_score" in row and "letter" in row:
                normalized.append(
                    {
                        "min_score": float(row["min_score"]),
                        "letter": str(row["letter"]),
                    }
                )
                continue
            if "min_inclusive" in row and "grade" in row:
                normalized.append(
                    {
                        "min_score": float(row["min_inclusive"]),
                        "letter": str(row["grade"]),
                    }
                )
        return normalized
