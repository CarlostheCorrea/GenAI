import type { RubricItem } from "../types/contracts.js";

interface ValidationSummary {
  rubric: RubricItem[];
  invalidCount: number;
}

export function validateRubricEvidence(cleanText: string, rubric: RubricItem[]): ValidationSummary {
  let invalidCount = 0;
  const updated = rubric.map((item) => {
    const invalidEvidence = item.evidence.filter((snippet) => !cleanText.includes(snippet));
    if (invalidEvidence.length === 0) {
      return { ...item, needsReview: false, invalidEvidence: [] };
    }
    invalidCount += invalidEvidence.length;
    return {
      ...item,
      evidence: item.evidence.filter((snippet) => cleanText.includes(snippet)),
      needsReview: true,
      invalidEvidence,
    };
  });

  return { rubric: updated, invalidCount };
}
