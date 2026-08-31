from typing import Any, Dict, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.state import AgentState, FormSubmissionDetails, JobPost, TailoredResume
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

# Compile graph once on startup
agent_app = build_agent_graph()


class ApplicationRequest(BaseModel):
    job: JobPost
    candidate_profile: Dict[str, Any]


class ApplicationResponse(BaseModel):
    application_status: str
    match_analysis: TailoredResume | None = None
    form_details: FormSubmissionDetails | None = None
    error_logs: List[str] = []


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "job-agent-core"}


@app.post("/jobs/apply", response_model=ApplicationResponse)
def trigger_job_application(payload: ApplicationRequest):
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.api:app", host="127.0.0.1", port=8000, reload=True)