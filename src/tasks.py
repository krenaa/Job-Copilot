import os
from celery import Celery
from dotenv import load_dotenv
from src.state import AgentState, JobPost
from src.workflow import build_agent_graph

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Initialize Celery app
celery_app = Celery(
    "career_copilot_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)

# Compile agent graph inside the worker process
agent_graph = build_agent_graph()


@celery_app.task(name="tasks.dispatch_job_application", bind=True)
def dispatch_job_application(self, job_dict: dict, candidate_dict: dict) -> dict:
    """Background task that executes the LangGraph agent without blocking the HTTP server."""
    job = JobPost(**job_dict)

    initial_state: AgentState = {
        "raw_job": job,
        "candidate_profile": candidate_dict,
        "match_analysis": None,
        "form_details": None,
        "application_status": "QUEUED",
        "error_logs": [],
    }

    result = agent_graph.invoke(initial_state)

    return {
        "status": result.get("application_status"),
        "match_score": (
            result["match_analysis"].match_score
            if result.get("match_analysis")
            else None
        ),
        "job_title": job.title,
        "company": job.company,
    }