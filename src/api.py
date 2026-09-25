import uuid
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langgraph.types import Command

from src.state import AgentState, GapAnalysisResult, InputState
from src.workflow import build_gap_analyzer_graph

app = FastAPI(
    title="Resume Gap Analyzer Agent",
    description="LangGraph Human-in-the-Loop Resume vs JD Gap Analysis API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory graph checkpointer
graph = build_gap_analyzer_graph()


class AnalyzeRequest(BaseModel):
    job_description_text: str
    resume_text: str


class AnalyzeResponse(BaseModel):
    thread_id: str
    status: str
    proposed_gap: Optional[GapAnalysisResult] = None
    interrupt_message: Optional[str] = None


class ResumeRequest(BaseModel):
    thread_id: str
    user_feedback: Optional[str] = ""


class FinalResponse(BaseModel):
    thread_id: str
    status: str
    final_output: Optional[GapAnalysisResult] = None


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "resume-gap-analyzer"}


@app.post("/api/analyze", response_model=AnalyzeResponse)
def start_analysis(payload: AnalyzeRequest):
    """Starts the LangGraph workflow and runs until the HITL interrupt() step."""
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    initial_state: AgentState = {
        "jd_text": payload.job_description_text,
        "resume_text": payload.resume_text,
        "extracted_jd_skills": [],
        "extracted_candidate_skills": [],
        "gap_analysis": None,
        "user_feedback": None,
        "final_output": None,
    }

    try:
        result = graph.invoke(initial_state, config=config)
        interrupts = result.get("__interrupt__", [])
        interrupt_msg = (
            interrupts[0].value.get("message") if interrupts else None
        )

        return AnalyzeResponse(
            thread_id=thread_id,
            status="WAITING_FOR_REVIEW" if interrupts else "COMPLETED",
            proposed_gap=result.get("gap_analysis"),
            interrupt_message=interrupt_msg,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/resume", response_model=FinalResponse)
def resume_analysis(payload: ResumeRequest):
    """Resumes the paused graph from the HITL step with user feedback."""
    config = {"configurable": {"thread_id": payload.thread_id}}

    try:
        final_result = graph.invoke(
            Command(resume=payload.user_feedback or ""), config=config
        )
        return FinalResponse(
            thread_id=payload.thread_id,
            status="FINALIZED",
            final_output=final_result.get("final_output"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.api:app", host="127.0.0.1", port=8000, reload=True)