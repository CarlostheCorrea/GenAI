# AI Essay Grader - Refined Implementation Ideas

## 1. Quick Analysis of `Product-spect.md`
- Core user flow is clear: upload file -> choose level -> extract text -> return grading + edits + learning gaps.
- Strong requirement: every rubric score must map to exact essay evidence (anti-hallucination guardrail).
- Spec is incomplete (ends at line 108 inside JSON). We need explicit assumptions for missing parts.

## 2. Assumptions to Unblock Build
- Single user session workflow first (no auth in v1 MVP).
- English essays only.
- Max upload size: 10 MB.
- One grading run per request (for "all levels", run 3 internal evaluations and merge result).
- Use OpenAI Responses API (structured JSON output) for grading and edits.

## 3. MVP Scope (Run-Ready)
- Upload `.txt`, `.docx`, `.pdf`.
- Extract `raw_text`, normalize to `clean_text`, split into `paragraphs` and `sentence_map`.
- Grade on selected level with 6 rubric categories.
- Enforce evidence validation: reject model evidence if not exact substring in extracted text.
- Return grammar/flow edits with context anchors.
- Simple UI: upload, level selector, results tabs (Rubric, Edits, Learning Gap).

## 4. Recommended Stack
- Frontend: Next.js 14 + TypeScript + Tailwind.
- Backend API: Next.js Route Handlers (single deploy target, faster MVP).
- Parsing libs:
  - TXT: Node fs decode.
  - DOCX: `mammoth`.
  - PDF: `pdf-parse`.
- Validation: `zod`.
- Storage: in-memory for MVP (or SQLite via Prisma if persistence needed).

## 5. API Contract (Draft)

### `POST /api/analyze`
Request (`multipart/form-data`):
- `file`: essay file
- `targetLevel`: `high_school | college | phd | all`

Response (JSON):
- `extraction`: `{ rawText, cleanText, paragraphs, sentenceMap, extractionWarnings[] }`
- `grades`: list of level results
- `edits`: list of grammar/flow edits
- `learningGap`: strengths + next steps
- `diagnostics`: phd-only voice/tone section (optional)

## 6. Core Data Shapes
```ts
type GradeLevel = "high_school" | "college" | "phd";

interface SentenceRef {
  id: string;
  text: string;
  start: number;
  end: number;
  paragraphIndex: number;
}

interface RubricItem {
  category:
    | "thesis"
    | "organization"
    | "evidence_reasoning"
    | "analysis_originality"
    | "style_clarity"
    | "mechanics";
  score: number; // e.g. 1-5
  rationale: string;
  evidence: string[]; // exact substrings
}

interface SuggestedEdit {
  id: string;
  type: "grammar" | "flow";
  original_text: string;
  suggested_text: string;
  context_prefix: string;
  context_suffix: string;
  explanation: string;
}
```

## 7. Guardrail Logic (Must-Have)
- After model returns rubric evidence:
  - For each evidence snippet: `cleanText.includes(snippet)` must be true.
  - If false, auto-repair once by asking model to re-ground with exact snippets.
  - If still false, mark rubric item as `needs_review` and do not show invalid evidence as trusted.

## 8. Implementation Order
1. Initialize Next.js TypeScript app and upload UI.
2. Build extraction pipeline (`txt/docx/pdf`) + warning detection for poor PDF text density.
3. Add sentence mapping with character offsets.
4. Implement grader prompt + structured JSON schema.
5. Add evidence validator + retry logic.
6. Add edits panel with accept/reject actions in UI state.
7. Add learning gap synthesis.
8. Add "Run all levels" comparison view.

## 9. File/Module Plan
- `src/app/page.tsx`: upload + results UI.
- `src/app/api/analyze/route.ts`: orchestration endpoint.
- `src/lib/extract.ts`: file parsing + cleanup.
- `src/lib/sentence-map.ts`: sentence tokenizer + offsets.
- `src/lib/grader.ts`: model calls and schema parsing.
- `src/lib/evidence-validator.ts`: substring guardrails.
- `src/types/contracts.ts`: shared interfaces.

## 10. Testing Plan (Minimum)
- Unit tests:
  - extraction for txt/docx/pdf
  - sentence offset correctness
  - evidence validator pass/fail cases
- Integration test:
  - upload -> analyze -> valid JSON contract
- Manual checks:
  - scanned/low-quality PDF warning
  - "all levels" returns 3 distinct evaluations

## 11. Definition of Done (MVP)
- App runs locally and accepts all 3 file types.
- At least one complete grading response renders in UI.
- Evidence snippets are always validated before display.
- Edit suggestions can be accepted/rejected without breaking text state.
- Errors and warnings are surfaced clearly to user.
