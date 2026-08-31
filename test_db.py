from src.db import init_db, SessionLocal, JobApplicationRecord
from src.state import AgentState, JobPost, TailoredResume
from src.workflow import build_agent_graph

def run_db_test():
    print("[*] Initializing Database Schema...")
    init_db()
    
    app = build_agent_graph()
    
    sample_job = JobPost(
        title="AI Engineer",
        company="Shivay Intelligence",
        description="Build multi-agent workflows using LangGraph and FastAPI.",
        apply_url="https://httpbin.org/forms/post",
        required_skills=["Python", "FastAPI", "LangGraph", "Docker"]
    )
    
    initial_state: AgentState = {
        "raw_job": sample_job,
        "candidate_profile": {
            "name": "Krena Patel",
            "email": "krena@example.com",
            "phone": "+91 9876543210",
            "linkedin": "https://linkedin.com/in/krena",
            "github": "https://github.com/krenaa",
            "portfolio": "https://krena.dev",
            "skills": ["Python", "FastAPI", "Docker", "React", "PostgreSQL", "LangGraph", "Playwright"]
        },
        "match_analysis": None,
        "form_details": None,
        "application_status": "SCOUTED",
        "error_logs": []
    }
    
    print("[*] Executing workflow with database auto-persistence...")
    app.invoke(initial_state)
    
    # Query database to verify record insertion
    session = SessionLocal()
    records = session.query(JobApplicationRecord).all()
    print(f"\n[+] Total records in database: {len(records)}")
    for r in records:
        print(f"  - Record #{r.id}: {r.title} @ {r.company} | Status: {r.application_status} | Score: {r.match_score}%")
    session.close()

if __name__ == "__main__":
    run_db_test()