from src.state import AgentState, JobPost
from src.workflow import build_agent_graph


def main():
    print("[*] Compiling LangGraph agent workflow...")
    app = build_agent_graph()

    # Define Candidate Profile
    candidate = {
        "name": "Krena Patel",
        "title": "Software Developer & AI Engineer",
        "skills": [
            "Python",
            "FastAPI",
            "Docker",
            "React",
            "PostgreSQL",
            "LangGraph",
            "Playwright",
        ],
        "experience": "Built autonomous multi-agent pipelines and full-stack cloud applications.",
    }

    # Test Case 1: Strong Match Role (Should route to prepare_application)
    strong_job = JobPost(
        title="AI Workflow Engineer",
        company="Shivay Intelligence",
        description="Build multi-agent workflows using LangGraph, Python, and FastAPI.",
        apply_url="https://example.com/apply/ai-engineer",
        required_skills=["Python", "FastAPI", "LangGraph", "Docker"],
    )

    initial_state: AgentState = {
        "raw_job": strong_job,
        "candidate_profile": candidate,
        "match_analysis": None,
        "application_status": "SCOUTED",
        "error_logs": [],
    }

    print("\n==========================================")
    print("Executing Graph for Strong Match Job...")
    print("==========================================")
    final_state = app.invoke(initial_state)

    print("\n--- Final Graph State Result ---")
    print(f"Final Status: {final_state['application_status']}")
    print(f"Match Score: {final_state['match_analysis'].match_score}%")
    print(
        f"ATS Tailored Summary: {final_state['match_analysis'].tailored_summary}"
    )


if __name__ == "__main__":
    main()