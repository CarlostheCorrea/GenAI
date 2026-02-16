# AI Homework / Essay Grader Web App — Product Specification (v1)

---

## 1. Product Goals

### Primary User Flow
1. User uploads a `.txt`, `.pdf`, or `.docx` file.
2. User selects grading target:
   - **High School**
   - **College**
   - **PhD**
   - Optional: **Run all levels (comparison)**
3. System extracts and cleans text.
4. System returns:
   - Rubric-based grade (with evidence mapping)
   - Grammar and flow edits (accept/reject)
   - Learning Gap analysis (“Path to Next Level”)
   - PhD-only tone & voice diagnostics (if applicable)

### Success Criteria
- Feedback is **traceable** (no unexplained scores).
- Edits are **actionable** and easy to apply.
- Level distinctions are **meaningful and explicit**.

---

## 2. Core Features

### A. Upload & Text Extraction

**Supported Formats**
- `.txt`: direct read
- `.docx`: paragraph extraction
- `.pdf`: text extraction + quality detection

**PDF Quality Warnings**
- If extraction is poor (e.g., scanned PDF):
  - Display warning: *“Text extraction may be incomplete. Consider uploading DOCX or TXT.”*

**Extraction Output**
- `raw_text`
- `clean_text`
- `paragraphs[]`
- `sentence_map[]` (for evidence highlighting)

---

### B. Multi-Level Grading (HS / College / PhD)

**Shared Rubric Categories**
1. Thesis / Main Claim
2. Organization & Coherence
3. Evidence & Reasoning
4. Analysis Depth / Originality
5. Style & Clarity
6. Mechanics

**Anchor Expectations (Built into System Prompt)**

| Level        | Thesis Expectation                          | Evidence Expectation                                  |
|--------------|---------------------------------------------|------------------------------------------------------|
| High School  | Clear statement in the introduction          | At least two distinct examples                       |
| College      | Arguable, non-obvious claim                  | Critical analysis, not summary                       |
| PhD          | Novel contribution or gap identification    | Methodological rigor & counterargument handling      |

Purpose: Prevent grade inflation and enforce level realism.

---

### C. AI Hallucination Guardrail: Evidence Map

**Problem**
AI graders may invent quotes or misattribute claims.

**Solution**
- Every rubric score **must reference evidence** from the essay.
- Evidence must be an **exact substring** from extracted text.

**UI Behavior**
- Clicking a rubric score highlights:
  - The sentence(s) used as evidence
  - A “Why this sentence?” explanation panel

---

### D. Grammar & Flow Edits (Accept / Reject)

#### Edit Types
- **Grammar**: spelling, agreement, punctuation
- **Flow**: clarity, transitions, redundancy

#### Robust Edit Schema (Context-Anchored)

```json
{
  "edits": [
    {
      "id": "uuid-123",
      "type": "grammar",
      "original_text": "They was going",
      "suggested_text": "They were going",
      "context_prefix": "Yesterday, ",
      "context_suffix": " to the store.",
      "explanation": "Subject-verb agreement."
    }
  ]
}
