# Rubric Grader (Backend + Frontend)

Single FastAPI service with:

- rubric-based grading
- grammar/clarity edit suggestions
- follow-up Q&A over grading results
- a built-in web frontend at `/`

## Quick Start (Local)

```bash
pip install -r requirements.txt
export OPENAI_API_KEY="your_key_here"
uvicorn main:app --reload
```

Open: [http://127.0.0.1:8000](http://127.0.0.1:8000)

## Frontend Workflow

1. Create session with text + rubric
2. Run grading (`/sessions/{id}/grade`)
3. Request edits (`/sessions/{id}/edit`)
4. Ask follow-up questions (`/sessions/{id}/ask`)

## API Endpoints

- `GET /rubrics`
- `GET /health`
- `POST /sessions`
- `POST /sessions/{session_id}/grade`
- `POST /sessions/{session_id}/edit`
- `POST /sessions/{session_id}/ask`

## Rubrics

Rubrics are loaded from `FileJson/` with fixed IDs:

- `OtherCatMeta_updated.json` -> `college_cross_disciplinary_other_v1`
- `NatSciMeta_updated.json` -> `essay_quality_v2`
- `phdMeta_updated.json` -> `phd_unified_meta_v3`
- `HumanSosMeta_updated.json` -> `college_humanities_social_sciences_meta_v2`

## Docker Deploy (Recommended)

Build and run as a single container:

```bash
docker build -t rubric-grader .
docker run --rm -p 8000:8000 -e OPENAI_API_KEY="$OPENAI_API_KEY" rubric-grader
```

Then open: [http://localhost:8000](http://localhost:8000)

## Deploy Platforms

This repo is deploy-ready for container platforms (Render, Railway, Fly.io, ECS, Cloud Run, etc.) using:

- `Dockerfile`
- `PORT` env support in container start command

Required env var:

- `OPENAI_API_KEY`

## Notes

- Session storage is currently in-memory; restarting the service clears sessions.
- Category and overall scores are computed by backend code.
- The system does not request or return chain-of-thought.
