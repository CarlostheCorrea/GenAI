import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractTextFromUpload } from "./lib/extract.js";
import { validateRubricEvidence } from "./lib/evidence-validator.js";
import { gradeEssay, repairEvidence } from "./lib/grader.js";
import type {
  AnalyzeResponse,
  GradeLevel,
  GradeTarget,
  SuggestedEdit,
} from "./types/contracts.js";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

const allowedExtensions = new Set(["txt", "docx", "pdf"]);

function extensionFromFileName(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function levelsFromTarget(targetLevel: GradeTarget): GradeLevel[] {
  if (targetLevel === "all") {
    return ["high_school", "college", "phd"];
  }
  return [targetLevel];
}

function dedupeEdits(edits: SuggestedEdit[]): SuggestedEdit[] {
  const seen = new Set<string>();
  const result: SuggestedEdit[] = [];
  for (const edit of edits) {
    const key = `${edit.type}::${edit.original_text}::${edit.suggested_text}::${edit.context_prefix}::${edit.context_suffix}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(edit);
    }
  }
  return result;
}

app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const targetLevel = (req.body.targetLevel as GradeTarget) || "college";

    if (!file) {
      res.status(400).json({ error: "Missing upload file." });
      return;
    }

    if (!["high_school", "college", "phd", "all"].includes(targetLevel)) {
      res.status(400).json({ error: "Invalid target level." });
      return;
    }

    const ext = extensionFromFileName(file.originalname);
    if (!allowedExtensions.has(ext)) {
      res.status(400).json({ error: "Unsupported file type. Use .txt, .docx, or .pdf." });
      return;
    }

    const extraction = await extractTextFromUpload(file.originalname, file.buffer);
    const levels = levelsFromTarget(targetLevel);

    const gradeRuns = await Promise.all(
      levels.map(async (level) => {
        const { grade, edits } = await gradeEssay(extraction.cleanText, level);
        let validation = validateRubricEvidence(extraction.cleanText, grade.rubric);
        if (validation.invalidCount > 0) {
          const repairedRubric = await repairEvidence(extraction.cleanText, level, grade.rubric);
          validation = validateRubricEvidence(extraction.cleanText, repairedRubric);
        }
        return {
          grade: {
            ...grade,
            rubric: validation.rubric,
          },
          edits,
        };
      }),
    );

    const grades = gradeRuns.map((run) => run.grade);
    const edits = dedupeEdits(gradeRuns.flatMap((run) => run.edits));

    const response: AnalyzeResponse = {
      extraction,
      grades,
      edits,
    };

    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    res.status(500).json({ error: message });
  }
});

app.get("*", (_, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`AI Essay Grader running at http://localhost:${port}`);
});
