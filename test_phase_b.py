from langgraph.types import Command
from src.state import AgentState
from src.workflow import build_gap_analyzer_graph


def test_gap_analyzer_standalone():
    print("[1] Compiling Gap Analyzer LangGraph with Memory Checkpointer...")
    graph = build_gap_analyzer_graph()

    sample_jd = """
    We are looking for a Senior AI Workflow Engineer.
    Requirements:
    - Strong proficiency in Python, FastAPI, and LangGraph.
    - Hands-on experience with Docker, Kubernetes, and PostgreSQL.
    - Cloud experience with AWS.
    """

    sample_resume = """
    Senior Software Engineer with 4 years of experience.
    - Engineered scalable microservices using Python and FastAPI.
    - Built production data pipelines with PostgreSQL and Docker.
    - Mentioned LangGraph in personal explorations.
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

    thread_config = {"configurable": {"thread_id": "test-session-1"}}

    print("\n[2] Invoking Graph (Phase 1: Extraction & Comparison)...")
    paused_result = graph.invoke(initial_state, config=thread_config)

    # Verify pause at interrupt
    interrupts = paused_result.get("__interrupt__", [])
    print(f"[*] Graph execution paused at HITL step! Interrupt count: {len(interrupts)}")
    assert len(interrupts) > 0, "Error: Graph did not pause at interrupt()!"

    gap = paused_result.get("gap_analysis")
    print("\n--- Proposed Gap Analysis (Before Confirmation) ---")
    print(f"  [-] Missing: {gap.missing}")
    print(f"  [~] Weak:    {gap.weak}")
    print(f"  [+] Strong:  {gap.strong}")

    # Simulate user human-in-the-loop review feedback
    feedback = "I built extensive container workflows, move Docker to strong"
    print(f"\n[3] Submitting HITL User Feedback: '{feedback}'")
    print("[*] Resuming Graph via Command(resume=...)...")

    final_result = graph.invoke(Command(resume=feedback), config=thread_config)

    print("\n[4] Graph completed!")
    final_output = final_result.get("final_output")
    print("\n--- Final Confirmed Gap Analysis ---")
    print(f"  [-] Missing: {final_output.missing}")
    print(f"  [~] Weak:    {final_output.weak}")
    print(f"  [+] Strong:  {final_output.strong}")

    assert "Docker" in final_output.strong, "Error: User feedback was not applied in finalize_node!"
    print("\n[SUCCESS] Phase B test passed completely! Pauses at interrupt() and resumes correctly.")


if __name__ == "__main__":
    test_gap_analyzer_standalone()
