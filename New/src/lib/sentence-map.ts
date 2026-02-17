import { v4 as uuidv4 } from "uuid";
import type { SentenceRef } from "../types/contracts.js";

function paragraphSpans(text: string): Array<{ start: number; end: number; index: number }> {
  const spans: Array<{ start: number; end: number; index: number }> = [];
  const regex = /\n{2,}/g;
  let cursor = 0;
  let paragraphIndex = 0;
  let match = regex.exec(text);

  while (match) {
    spans.push({ start: cursor, end: match.index, index: paragraphIndex++ });
    cursor = match.index + match[0].length;
    match = regex.exec(text);
  }
  spans.push({ start: cursor, end: text.length, index: paragraphIndex });
  return spans.filter((span) => text.slice(span.start, span.end).trim().length > 0);
}

function findParagraphIndex(
  start: number,
  spans: Array<{ start: number; end: number; index: number }>,
): number {
  for (const span of spans) {
    if (start >= span.start && start <= span.end) {
      return span.index;
    }
  }
  return 0;
}

export function buildSentenceMap(cleanText: string): SentenceRef[] {
  const sentenceRegex = /[^.!?\n]+[.!?]+(?:["')\]]+)?|[^.!?\n]+$/gm;
  const spans = paragraphSpans(cleanText);
  const sentences: SentenceRef[] = [];
  let match = sentenceRegex.exec(cleanText);

  while (match) {
    const raw = match[0];
    const text = raw.trim();
    if (text.length > 0) {
      const start = match.index + raw.indexOf(text);
      const end = start + text.length;
      sentences.push({
        id: uuidv4(),
        text,
        start,
        end,
        paragraphIndex: findParagraphIndex(start, spans),
      });
    }
    match = sentenceRegex.exec(cleanText);
  }

  return sentences;
}
