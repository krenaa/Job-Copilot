import os
from typing import Literal
from dotenv import load_dotenv
from groq import Groq
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph

from src.matcher import analyze_job_match
from src.state import AgentState

load_dotenv()


def get_llm():
    """Initializes and returns an active Groq LLM instance."""
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY not found in .env")

    client = Groq(api_key=groq_api_key)
    models_data = client.models.list().data
    available = [
        m.id
        for m in models_data
        if not any(
            skip in m.id.lower()
            for skip in ["whisper", "guard", "vision", "embed"]
        )
    ]

    preferred = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
    chosen_model = next((m for m in preferred if m in available), available[0])

    return ChatGroq(
        model=chosen_model, groq_api_key=groq_api_key, temperature=0.1
    )


# Node 1: Matcher Node
def matcher_node(state: AgentState) -> dict:
    print("\n--- [Node: Matcher] Analyzing job fit with LLM ---")
    llm = get_llm()
    return analyze_job_match(state, llm=llm)


# Node 2: Application Preparation Node (High Fit)
def prepare_application_node(state: AgentState) -> dict:
    analysis = state.get("match_analysis")
    score = analysis.match_score if analysis else 0
    print(
        f"\n--- [Node: Prepare Application] Match Score: {score}% (Passed threshold) ---"
    )
    print(
        f"Ready to submit application for: {state['raw_job'].title} at {state['raw_job'].company}"
    )
    return {"application_status": "READY_TO_APPLY"}


# Node 3: Skip Job Node (Low Fit)
def skip_job_node(state: AgentState) -> dict:
    analysis = state.get("match_analysis")
    score = analysis.match_score if analysis else 0
    print(
        f"\n--- [Node: Skip Job] Match Score: {score}% (Below threshold) ---"
    )
    print(f"Skipping application for: {state['raw_job'].title}")
    return {"application_status": "SKIPPED_LOW_MATCH"}


# Conditional Routing Function
def route_by_match_score(
    state: AgentState,
) -> Literal["prepare_application", "skip_job"]:
    analysis = state.get("match_analysis")
    score = analysis.match_score if analysis else 0
    threshold = 60  # Minimum percentage required to proceed

    if score >= threshold:
        return "prepare_application"
    return "skip_job"


# Build the Graph
def build_agent_graph():
    builder = StateGraph(AgentState)

    # 1. Add Nodes
    builder.add_node("matcher", matcher_node)
    builder.add_node("prepare_application", prepare_application_node)
    builder.add_node("skip_job", skip_job_node)

    # 2. Add Edges
    builder.add_edge(START, "matcher")

    # 3. Add Conditional Edge from matcher
    builder.add_conditional_edges(
        "matcher",
        route_by_match_score,
        {
            "prepare_application": "prepare_application",
            "skip_job": "skip_job",
        },
    )

    # 4. Connect terminal nodes to END
    builder.add_edge("prepare_application", END)
    builder.add_edge("skip_job", END)

    return builder.compile()