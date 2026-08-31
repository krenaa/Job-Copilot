from typing import Any, Dict, List, Optional
from celery.result import AsyncResult
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.db import JobApplicationRecord, SessionLocal
from src.state import AgentState, FormSubmissionDetails, JobPost, TailoredResume
from src.tasks import celery_app, dispatch_job_application
from src.workflow import build_agent_graph

app = FastAPI(
    title="Career Copilot AI Agent",
    description="Autonomous job application agent with LangGraph and Playwright",
    version="1.0.0",
)

# Enable CORS for Next.js Generative UI frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compile LangGraph state machine once on startup
agent_app = build_agent_graph()


class ApplicationRequest(BaseModel):
    job: JobPost
    candidate_profile: Dict[str, Any]


class ApplicationResponse(BaseModel):
    application_status: str
    match_analysis: Optional[TailoredResume] = None
    form_details: Optional[FormSubmissionDetails] = None
    error_logs: List[str] = []


class AsyncTaskResponse(BaseModel):
    task_id: str
    status: str
    message: str


class TaskStatusResponse(BaseModel):
    task_id: str
    state: str
    result: Optional[Dict[str, Any]] = None


@app.get("/health")
def health_check():
    """Service health probe."""
    return {"status": "healthy", "service": "job-agent-core"}


@app.post("/jobs/apply", response_model=ApplicationResponse)
def trigger_job_application(payload: ApplicationRequest):
    """Synchronously executes the LangGraph agent workflow for an individual job."""
    initial_state: AgentState = {
        "raw_job": payload.job,
        "candidate_profile": payload.candidate_profile,
        "match_analysis": None,
        "form_details": None,
        "application_status": "SCOUTED",
        "error_logs": [],
    }

    try:
        final_state = agent_app.invoke(initial_state)
        return ApplicationResponse(
            application_status=final_state.get("application_status", "UNKNOWN"),
            match_analysis=final_state.get("match_analysis"),
            form_details=final_state.get("form_details"),
            error_logs=final_state.get("error_logs", []),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Agent execution failed: {str(e)}"
        )


@app.post("/jobs/apply-async", response_model=AsyncTaskResponse)
def trigger_job_application_async(payload: ApplicationRequest):
    """Offloads the application job to Celery & Redis and returns an async tracking ID."""
    try:
        job_payload = payload.job.model_dump()
        task = dispatch_job_application.delay(
            job_payload, payload.candidate_profile
        )
        return AsyncTaskResponse(
            task_id=task.id,
            status="QUEUED",
            message="Application agent dispatched to background Celery queue.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to enqueue task: {str(e)}"
        )


@app.get("/tasks/{task_id}", response_model=TaskStatusResponse)
def get_task_status(task_id: str):
    """Polls the status of an asynchronous background agent task from Redis."""
    try:
        result = AsyncResult(task_id, app=celery_app)
        return TaskStatusResponse(
            task_id=task_id,
            state=result.state,
            result=result.result if result.ready() else None,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to query task status: {str(e)}"
        )


@app.get("/history")
def get_application_history():
    """Retrieves all historical application attempts stored in the database."""
    session = SessionLocal()
    try:
        records = (
            session.query(JobApplicationRecord)
            .order_by(JobApplicationRecord.created_at.desc())
            .all()
        )
        return [
            {
                "id": r.id,
                "title": r.title,
                "company": r.company,
                "apply_url": r.apply_url,
                "match_score": r.match_score,
                "application_status": r.application_status,
                "matched_skills": r.matched_skills,
                "missing_skills": r.missing_skills,
                "created_at": r.created_at,
            }
            for r in records
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Database query failed: {str(e)}"
        )
    finally:
        session.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.api:app", host="127.0.0.1", port=8000, reload=True)