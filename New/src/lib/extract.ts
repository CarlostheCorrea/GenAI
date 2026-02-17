import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { buildSentenceMap } from "./sentence-map.js";
import type { ExtractionResult } from "../types/contracts.js";

function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitParagraphs(cleanText: string): string[] {
  return cleanText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function extensionFromFileName(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function validateNonEmptyText(rawText: string): void {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error("No readable text found in the uploaded file.");
  }
}

export async function extractTextFromUpload(fileName: string, buffer: Buffer): Promise<ExtractionResult> {
  const ext = extensionFromFileName(fileName);
  const extractionWarnings: string[] = [];

  let rawText = "";

  if (ext === "txt") {
    rawText = buffer.toString("utf-8");
  } else if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    rawText = result.value ?? "";
  } else if (ext === "pdf") {
    const pdfResult = await pdfParse(buffer);
    rawText = pdfResult.text ?? "";
    const pages = Math.max(pdfResult.numpages ?? 1, 1);
    const density = rawText.trim().length / pages;
    if (density < 300) {
      extractionWarnings.push(
        "Text extraction may be incomplete. Consider uploading DOCX or TXT.",
      );
    }
  } else {
    throw new Error("Unsupported file type. Use .txt, .docx, or .pdf.");
  }

  validateNonEmptyText(rawText);

  const cleanText = normalizeWhitespace(rawText);
  const paragraphs = splitParagraphs(cleanText);
  const sentenceMap = buildSentenceMap(cleanText);

  return {
    rawText,
    cleanText,
    paragraphs,
    sentenceMap,
    extractionWarnings,
  };
}
