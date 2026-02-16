from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from orchestrators.langgraph_flow import LangGraphFlow
from orchestrators.pydanticai_flow import PydanticAIFlow
from schemas import (
    AskRequest,
    CreateSessionRequest,
    CreateSessionResponse,
    EditRequest,
    GradeRequest,
    RubricInfo,
)
from services.llm_client import LLMClient
from services.model_router import estimate_tokens
from services.rubric_loader import RubricLoader
from services.session_store import InMemorySessionStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Rubric Grader Backend", version="1.0.0")
frontend_dir = Path(__file__).parent / "frontend"

rubrics: Dict[str, dict] = {}
session_store = InMemorySessionStore()
llm_client: LLMClient | None = None
langgraph_flow: LangGraphFlow | None = None
pydanticai_flow: PydanticAIFlow | None = None


def _get_flow(orchestrator: str):
    if orchestrator == "langgraph":
        if langgraph_flow is None:
            raise HTTPException(status_code=500, detail="LangGraph flow not initialized")
        return langgraph_flow
    if orchestrator == "pydanticai":
        if pydanticai_flow is None:
            raise HTTPException(status_code=500, detail="PydanticAI flow not initialized")
        return pydanticai_flow
    raise HTTPException(status_code=400, detail="Invalid orchestrator")


@app.on_event("startup")
def startup() -> None:
    global rubrics, llm_client, langgraph_flow, pydanticai_flow
    loader = RubricLoader(Path(__file__).parent / "FileJson")
    rubrics = loader.load_all()

    llm_client = LLMClient()
    langgraph_flow = LangGraphFlow(llm_client)
    pydanticai_flow = PydanticAIFlow(llm_client)


@app.get("/rubrics", response_model=list[RubricInfo])
def list_rubrics() -> list[RubricInfo]:
    return [RubricInfo(rubric_id=k, name=v.get("name", k)) for k, v in rubrics.items()]


@app.get("/health", include_in_schema=False)
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def serve_frontend() -> FileResponse:
    return FileResponse(frontend_dir / "index.html")


app.mount("/static", StaticFiles(directory=frontend_dir), name="static")


@app.post("/sessions", response_model=CreateSessionResponse)
def create_session(req: CreateSessionRequest) -> CreateSessionResponse:
    rubric_json = rubrics.get(req.rubric_id)
    if not rubric_json:
        raise HTTPException(status_code=404, detail="Unknown rubric_id")

    chars = len(req.document_text)
    est_toks = estimate_tokens(req.document_text)
    logger.info(
        "Request received. type=create_session session_id=%s rubric_id=%s doc_chars=%s est_tokens=%s orchestrator=%s",
        None,
        req.rubric_id,
        chars,
        est_toks,
        req.orchestrator,
    )

    session = session_store.create(req.document_text, req.rubric_id, rubric_json)
    return CreateSessionResponse(session_id=session.session_id)


@app.post("/sessions/{session_id}/grade")
def grade_session(session_id: str, req: GradeRequest):
    session = session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    rubric_id = req.rubric_id or session.rubric_id
    rubric_json = rubrics.get(rubric_id)
    if not rubric_json:
        raise HTTPException(status_code=404, detail="Unknown rubric_id")

    session.rubric_id = rubric_id
    session.rubric_json = rubric_json

    chars = len(session.document_text)
    est_toks = estimate_tokens(session.document_text + (req.user_instruction or ""))
    logger.info(
        "Request received. type=grade session_id=%s rubric_id=%s doc_chars=%s est_tokens=%s orchestrator=%s",
        session_id,
        rubric_id,
        chars,
        est_toks,
        req.orchestrator,
    )

    flow = _get_flow(req.orchestrator)
    result = flow.grade_document(
        document_text=session.document_text,
        rubric_id=rubric_id,
        rubric_json=rubric_json,
        user_instruction=req.user_instruction,
        grammar_only=req.grammar_only,
    )

    session.grading_result = result
    if req.user_instruction:
        session.conversation.append({"role": "user", "content": req.user_instruction})
    session.conversation.append({"role": "assistant", "content": f"Grading complete: {result.get('overall_score_1_to_4')}"})
    session_store.update(session)
    return result


@app.post("/sessions/{session_id}/edit")
def edit_session(session_id: str, req: EditRequest):
    session = session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    chars = len(session.document_text)
    est_toks = estimate_tokens(session.document_text + (req.instruction or ""))
    logger.info(
        "Request received. type=edit session_id=%s rubric_id=%s doc_chars=%s est_tokens=%s orchestrator=%s",
        session_id,
        session.rubric_id,
        chars,
        est_toks,
        req.orchestrator,
    )

    flow = _get_flow(req.orchestrator)
    result = flow.suggest_edits(
        document_text=session.document_text,
        rubric_id=session.rubric_id,
        instruction=req.instruction,
    )
    session.conversation.append({"role": "assistant", "content": "Provided grammar/clarity edits."})
    session_store.update(session)
    return result


@app.post("/sessions/{session_id}/ask")
def ask_session(session_id: str, req: AskRequest):
    session = session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if not session.grading_result:
        raise HTTPException(status_code=400, detail="Grade the session first before follow-up Q&A")

    chars = len(session.document_text)
    est_toks = estimate_tokens(session.document_text + req.question)
    logger.info(
        "Request received. type=followup session_id=%s rubric_id=%s doc_chars=%s est_tokens=%s orchestrator=%s",
        session_id,
        session.rubric_id,
        chars,
        est_toks,
        req.orchestrator,
    )

    flow = _get_flow(req.orchestrator)
    result = flow.answer_followup(
        document_text=session.document_text,
        rubric_id=session.rubric_id,
        rubric_json=session.rubric_json,
        grading_result=session.grading_result,
        question=req.question,
        prior_messages=session.conversation,
    )

    session.conversation.append({"role": "user", "content": req.question})
    session.conversation.append({"role": "assistant", "content": str(result)})
    session_store.update(session)
    return result
