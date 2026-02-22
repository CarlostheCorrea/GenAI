# Rubric Grader

Rubric Grader is a local FastAPI app with a built-in web UI for:

- rubric-based grading
- grammar/clarity edit suggestions
- follow-up Q&A on grading results

## Requirements

- Python 3.10+ (Python 3.11 or 3.12 recommended for easiest installs)
- OpenAI API key

## Quick Start (3 Steps)

### 1. Clone and enter the project

```bash
git clone https://github.com/CarlostheCorrea/GenAI.git
cd GenAI/GraderProject
```

### 2. Set your OpenAI API key

macOS/Linux:

```bash
export OPENAI_API_KEY="your_key_here"
```

Windows PowerShell:

```powershell
$env:OPENAI_API_KEY="your_key_here"
```

### 3. Run the app

macOS/Linux:

```bash
./run.sh
```

Windows PowerShell:

```powershell
.\run.ps1
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Manual Run (No Script)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app
```

## Frontend Workflow

1. Choose a rubric.
2. Paste text or upload `.pdf`, `.txt`, or `.docx` and click `Extract Text From File`.
3. Click `Create Session`.
4. Run grading, edits, or follow-up Q&A.

## How To Use The App

1. In `Session Setup`, add your document:
   - Paste text directly into `Document Text`, or
   - Upload a `.txt`, `.pdf`, or `.docx` file and click `Extract Text From File`.
2. Pick the rubric that best matches your assignment.
3. Click `Create Session`.
4. Use one of the actions:
   - `Run Grading` to score the paper against the rubric.
   - `Generate Edits` for grammar/clarity suggestions.
   - `Ask` in `Follow-up Q&A` to ask questions about the paper or grading.

## Example Essays

Provided are example essays in different formats that can be used in the project.

[Essays](https://github.com/CarlostheCorrea/GenAI/tree/main/GraderProject/ExampleEssays)

## API Endpoints

- `GET /rubrics`
- `GET /health`
- `POST /documents/extract` (multipart upload: `.pdf`, `.txt`, `.docx`)
- `POST /sessions`
- `POST /sessions/{session_id}/grade`
- `POST /sessions/{session_id}/edit`
- `POST /sessions/{session_id}/ask`

## Rubric Files

- `FileJson/OtherCatMeta_updated.json` -> `college_cross_disciplinary_other_v1`
- `FileJson/NatSciMeta_updated.json` -> `essay_quality_v2`
- `FileJson/phdMeta_updated.json` -> `phd_unified_meta_v3`
- `FileJson/HumanSosMeta_updated.json` -> `college_humanities_social_sciences_meta_v2`

## Notes

- Sessions are stored in memory; restarting the app clears sessions.
- Calibration examples are loaded from `SampleEssays/` per rubric and used as internal scoring anchors.
- The system does not request or return chain-of-thought.

## Project Features

- Model differentiation (`gpt-4o` vs `gpt-4o-mini`):
  - Included via model routing logic in `services/model_router.py` (routes by estimated complexity/token load).
- Reliability pattern(s):
  - Chain-of-Thought (CoT): Included as internal-only reasoning for grading (`reasoning_mode="on"`), not exposed in outputs.
  - Analogical Prompting: Included via rubric calibration examples from `SampleEssays/` injected into grading prompts.
- Agent/orchestration framework:
  - PydanticAI-style type-safe validation flow: Included and used in default grading path (`orchestrators/pydanticai_flow.py`).
  - LangGraph state-machine flow: Also implemented (`orchestrators/langgraph_flow.py`), but default app usage is PydanticAI.

## Troubleshooting

- `OPENAI_API_KEY is not set`:
  - Set the environment variable, then rerun the app.
- `Address already in use` on port 8000:
  - Stop the process using port 8000, or run:
  - `uvicorn main:app --port 8001`
- Browser shows stale UI behavior:
  - Hard refresh (`Cmd+Shift+R` on macOS, `Ctrl+F5` on Windows).
- Server restarts repeatedly in a loop:
  - Use stable mode without reload: `uvicorn main:app`
- `Could not build wheels for grpcio` / `Could not find <Python.h>`:
  - Delete and recreate the virtual environment, then reinstall:
  - `rm -rf .venv && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
  - If possible, use Python 3.11 or 3.12.
