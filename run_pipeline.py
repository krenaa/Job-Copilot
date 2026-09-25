import uuid
from langgraph.types import Command
from src.state import AgentState
from src.workflow import build_gap_analyzer_graph


def main():
    print("==================================================")
    print("      Resume Gap Analyzer Agent (LangGraph HITL)  ")
    print("==================================================")

    graph = build_gap_analyzer_graph()
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    sample_jd = """
    Position: Senior AI Workflow Engineer
    Required Skills & Experience:
    - Python, FastAPI, and LangGraph workflow orchestration.
    - Containerization and orchestration with Docker and Kubernetes.
    - Relational databases (PostgreSQL) and cloud infrastructure (AWS).
    """

    sample_resume = """
    Candidate: Krena Patel
    Professional Summary:
    Full Stack & AI Engineer with 4 years building intelligent applications.
    Key Achievements:
    - Engineered asynchronous microservices with Python and FastAPI.
    - Designed relational schemas and query optimizations in PostgreSQL.
    - Containerized development and staging pipelines using Docker.
    - Explored LangGraph for prototype agent pipelines.
    """

    initial_state: AgentState = {
        "jd_text": sample_jd,
        "resume_text": sample_resume,
        "extracted_jd_skills": [],
        "extracted_candidate_skills": [],
        "gap_analysis": None,
        "user_feedback": None,
        "final_output": None,
    }

    print("\n[*] Phase 1: Analyzing Job Description and Candidate Resume...")
    step1_result = graph.invoke(initial_state, config=config)

    interrupts = step1_result.get("__interrupt__", [])
    if interrupts:
        print("\n[PAUSE] Execution suspended by LangGraph interrupt()!")
        gap = step1_result.get("gap_analysis")
        print("\n--- Proposed Gap Analysis (Pending Human Review) ---")
        print(f"  [-] Missing: {gap.missing}")
        print(f"  [~] Weak:    {gap.weak}")
        print(f"  [+] Strong:  {gap.strong}")

        # Human-in-the-Loop review input
        print("\n[*] Human-in-the-Loop: Submitting review adjustment...")
        feedback = "Move Docker to strong; candidate has 3 years production Docker experience"
        print(f"  Adjustment: '{feedback}'")

        print("\n[*] Phase 2: Resuming graph with user feedback...")
        final_result = graph.invoke(Command(resume=feedback), config=config)
        final_output = final_result.get("final_output")

        print("\n==================================================")
        print("          FINAL CONFIRMED GAP ANALYSIS            ")
        print("==================================================")
        print(f"  [-] Missing ({len(final_output.missing)}): {final_output.missing}")
        print(f"  [~] Weak    ({len(final_output.weak)}): {final_output.weak}")
        print(f"  [+] Strong  ({len(final_output.strong)}): {final_output.strong}")
        print("==================================================")


if __name__ == "__main__":
    main()