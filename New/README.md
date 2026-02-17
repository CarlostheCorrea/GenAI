# AI Essay Grader (OpenAI)

## Summary
This program is a web app that grades uploaded essays (`.txt`, `.docx`, `.pdf`) using the OpenAI API. It extracts and cleans text, evaluates writing quality at High School, College, or PhD level (or all three), and returns:
- A 6-category rubric with evidence snippets tied to the essay text
- Grammar and flow edit suggestions
- Learning gap feedback with strengths and next steps
- PhD tone/voice diagnostics when PhD grading is selected

It also validates rubric evidence against the extracted essay text and flags evidence that cannot be grounded.

## Requirements
- Node.js 20+ (includes `npm`)
- OpenAI API key

## Setup
1. Install dependencies:
```bash
npm install
```
2. Create `.env` from `.env.example`:
```bash
cp .env.example .env
```
3. Set your key in `.env`:
```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

## Run (dev)
```bash
npm run dev
```

Open:
- `http://localhost:3000`

## API
- `POST /api/analyze` (`multipart/form-data`)
  - `file`: `.txt | .docx | .pdf`
  - `targetLevel`: `high_school | college | phd | all`

## Notes
- PDF extraction warning is shown for low text density files.
- Rubric evidence is validated as exact substrings of extracted text.
- Invalid evidence triggers one repair pass before being flagged for review.
