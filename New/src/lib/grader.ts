import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type {
  GradeLevel,
  LearningGap,
  LevelGradeResult,
  PhdDiagnostics,
  RubricCategory,
  RubricItem,
  SuggestedEdit,
} from "../types/contracts.js";

const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY is missing. Set it in your environment.");
}

const client = new OpenAI({ apiKey });

const rubricCategoryValues: RubricCategory[] = [
  "thesis",
  "organization",
  "evidence_reasoning",
  "analysis_originality",
  "style_clarity",
  "mechanics",
];

const rubricItemSchema = z.object({
  category: z.enum(rubricCategoryValues),
  score: z.number().min(1).max(5),
  rationale: z.string().min(1),
  evidence: z.array(z.string()).default([]),
});

const editSchema = z.object({
  type: z.enum(["grammar", "flow"]),
  original_text: z.string().min(1),
  suggested_text: z.string().min(1),
  context_prefix: z.string(),
  context_suffix: z.string(),
  explanation: z.string().min(1),
});

const gradeSchema = z.object({
  rubric: z.array(rubricItemSchema).length(6),
  edits: z.array(editSchema),
  learningGap: z.object({
    strengths: z.array(z.string()),
    nextSteps: z.array(z.string()),
  }),
  diagnostics: z
    .object({
      tone: z.string(),
      voice: z.string(),
      notes: z.array(z.string()),
    })
    .optional(),
});

const rubricCategoryLabel: Record<RubricCategory, string> = {
  thesis: "Thesis / Main Claim",
  organization: "Organization & Coherence",
  evidence_reasoning: "Evidence & Reasoning",
  analysis_originality: "Analysis Depth / Originality",
  style_clarity: "Style & Clarity",
  mechanics: "Mechanics",
};

function levelGuidance(level: GradeLevel): string {
  if (level === "high_school") {
    return "High School anchor: clear thesis in intro, at least two distinct examples, basic coherence.";
  }
  if (level === "college") {
    return "College anchor: arguable, non-obvious thesis, critical analysis beyond summary, stronger structure and evidence use.";
  }
  return "PhD anchor: novel contribution or gap identification, methodological rigor, counterargument handling, advanced academic tone.";
}

function extractJsonObject(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model did not return JSON.");
  }
  return raw.slice(start, end + 1);
}

function getOutputText(response: unknown): string {
  const maybe = response as { output_text?: string };
  if (maybe.output_text && maybe.output_text.trim()) {
    return maybe.output_text;
  }

  const data = response as {
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  const chunks =
    data.output
      ?.flatMap((entry) => entry.content ?? [])
      .map((c) => c.text ?? "")
      .filter(Boolean) ?? [];

  return chunks.join("\n");
}

async function callJsonModel<T>(
  systemPrompt: string,
  userPrompt: string,
  validator: z.ZodType<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await client.responses.create({
        model,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const text = getOutputText(response);
      const parsed = JSON.parse(extractJsonObject(text));
      return validator.parse(parsed);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`OpenAI JSON generation failed: ${String(lastError)}`);
}

function normalizeRubricItems(items: z.infer<typeof rubricItemSchema>[]): RubricItem[] {
  const byCategory = new Map(items.map((item) => [item.category, item]));
  return rubricCategoryValues.map((category) => {
    const current = byCategory.get(category);
    if (current) {
      return {
        category,
        score: current.score,
        rationale: current.rationale,
        evidence: current.evidence,
      };
    }
    return {
      category,
      score: 1,
      rationale: `Missing rubric item for ${rubricCategoryLabel[category]}.`,
      evidence: [],
      needsReview: true,
      invalidEvidence: [],
    };
  });
}

export async function gradeEssay(
  cleanText: string,
  level: GradeLevel,
): Promise<{ grade: LevelGradeResult; edits: SuggestedEdit[] }> {
  const systemPrompt = [
    "You are an expert writing evaluator.",
    "Return JSON only. Do not include markdown.",
    "Rubric categories must include exactly:",
    rubricCategoryValues.join(", "),
    "Evidence snippets must be exact verbatim substrings from the essay.",
    "Keep rationales concise and concrete.",
  ].join("\n");

  const userPrompt = `
Evaluate this essay at level: ${level}.
${levelGuidance(level)}

Return JSON object with keys:
- rubric: array of 6 items [{category, score 1-5, rationale, evidence[]}]
- edits: array of grammar/flow edits [{type, original_text, suggested_text, context_prefix, context_suffix, explanation}]
- learningGap: {strengths: string[], nextSteps: string[]}
- diagnostics (include only when level=phd): {tone, voice, notes[]}

Essay:
"""${cleanText}"""
`.trim();

  const parsed = await callJsonModel(systemPrompt, userPrompt, gradeSchema);
  const diagnostics: PhdDiagnostics | undefined =
    level === "phd" ? parsed.diagnostics : undefined;
  const learningGap: LearningGap = parsed.learningGap;
  const rubric = normalizeRubricItems(parsed.rubric);
  const edits: SuggestedEdit[] = parsed.edits.map((edit) => ({
    id: uuidv4(),
    type: edit.type,
    original_text: edit.original_text,
    suggested_text: edit.suggested_text,
    context_prefix: edit.context_prefix,
    context_suffix: edit.context_suffix,
    explanation: edit.explanation,
  }));

  return {
    grade: {
      level,
      rubric,
      learningGap,
      diagnostics,
    },
    edits,
  };
}

const repairSchema = z.object({
  rubric: z.array(rubricItemSchema).length(6),
});

export async function repairEvidence(
  cleanText: string,
  level: GradeLevel,
  rubric: RubricItem[],
): Promise<RubricItem[]> {
  const systemPrompt = [
    "You fix evidence grounding in rubric feedback.",
    "Return JSON only.",
    "For each rubric item, provide evidence snippets that are exact verbatim substrings from the essay.",
    "Do not change categories. Keep existing score and rationale.",
  ].join("\n");

  const userPrompt = `
Level: ${level}
Given rubric:
${JSON.stringify(rubric)}

Return:
{ "rubric": [{category, score, rationale, evidence[]}] }

Essay:
"""${cleanText}"""
`.trim();

  const parsed = await callJsonModel(systemPrompt, userPrompt, repairSchema);
  return normalizeRubricItems(parsed.rubric);
}
