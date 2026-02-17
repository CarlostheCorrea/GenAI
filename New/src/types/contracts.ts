export type GradeLevel = "high_school" | "college" | "phd";
export type GradeTarget = GradeLevel | "all";

export type RubricCategory =
  | "thesis"
  | "organization"
  | "evidence_reasoning"
  | "analysis_originality"
  | "style_clarity"
  | "mechanics";

export interface SentenceRef {
  id: string;
  text: string;
  start: number;
  end: number;
  paragraphIndex: number;
}

export interface ExtractionResult {
  rawText: string;
  cleanText: string;
  paragraphs: string[];
  sentenceMap: SentenceRef[];
  extractionWarnings: string[];
}

export interface RubricItem {
  category: RubricCategory;
  score: number;
  rationale: string;
  evidence: string[];
  needsReview?: boolean;
  invalidEvidence?: string[];
}

export interface SuggestedEdit {
  id: string;
  type: "grammar" | "flow";
  original_text: string;
  suggested_text: string;
  context_prefix: string;
  context_suffix: string;
  explanation: string;
}

export interface LearningGap {
  strengths: string[];
  nextSteps: string[];
}

export interface PhdDiagnostics {
  tone: string;
  voice: string;
  notes: string[];
}

export interface LevelGradeResult {
  level: GradeLevel;
  rubric: RubricItem[];
  learningGap: LearningGap;
  diagnostics?: PhdDiagnostics;
}

export interface AnalyzeResponse {
  extraction: ExtractionResult;
  grades: LevelGradeResult[];
  edits: SuggestedEdit[];
}
