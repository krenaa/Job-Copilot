from src.state import AgentState, JobPost
from src.workflow import build_agent_graph


def main():
    print("[*] Compiling LangGraph agent workflow...")
    app = build_agent_graph()

    candidate = {
        "name": "Krena Patel",
        "email": "krena.patel@example.com",
        "phone": "+91 9876543210",
        "linkedin": "https://linkedin.com/in/krenapatel",
        "github": "https://github.com/krenaa",
        "portfolio": "https://krenapatel.dev",
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

    job = JobPost(
        title="AI Workflow Engineer",
        company="Shivay Intelligence",
        description="Build multi-agent workflows using LangGraph, Python, and FastAPI.",
        apply_url="https://httpbin.org/forms/post",  # Public standard HTML form for safe testing
        required_skills=["Python", "FastAPI", "LangGraph", "Docker"],
    )

    initial_state: AgentState = {
        "raw_job": job,
        "candidate_profile": candidate,
        "match_analysis": None,
        "form_details": None,
        "application_status": "SCOUTED",
        "error_logs": [],
    }

    print("\n==========================================")
    print("Executing End-to-End Autonomous Agent...")
    print("==========================================")
    final_state = app.invoke(initial_state)

    print("\n--- Final Agent Execution Summary ---")
    print(f"Final Status: {final_state['application_status']}")
    print(f"Match Score: {final_state['match_analysis'].match_score}%")
    print(
        f"Submitted For: {final_state['raw_job'].title} at {final_state['raw_job'].company}"
    )


if __name__ == "__main__":
    main()