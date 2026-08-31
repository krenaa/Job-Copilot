import os
from typing import Literal
from dotenv import load_dotenv
from groq import Groq
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph


from src.db import save_application_log
from src.applier import run_form_applier
from src.matcher import analyze_job_match
from src.state import AgentState

load_dotenv()


def get_llm():
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


def matcher_node(state: AgentState) -> dict:
    print("\n--- [Node 1: Matcher] Analyzing job fit with LLM ---")
    llm = get_llm()
    return analyze_job_match(state, llm=llm)


def applier_node(state: AgentState) -> dict:
    print("\n--- [Node 2: Browser Autopilot] Initializing Playwright Form Filler ---")
    res = run_form_applier(state)
    state.update(res)
    save_application_log(state)
    return res


def skip_job_node(state: AgentState) -> dict:
    analysis = state.get("match_analysis")
    score = analysis.match_score if analysis else 0
    print(f"\n--- [Node: Skip Job] Match Score: {score}% (Below threshold) ---")
    res = {"application_status": "SKIPPED_LOW_MATCH"}
    state.update(res)
    save_application_log(state)
    return res

def route_by_match_score(
    state: AgentState,
) -> Literal["applier_node", "skip_job_node"]:
    analysis = state.get("match_analysis")
    score = analysis.match_score if analysis else 0
    threshold = 60

    if score >= threshold:
        return "applier_node"
    return "skip_job_node"


def build_agent_graph():
    builder = StateGraph(AgentState)

    builder.add_node("matcher_node", matcher_node)
    builder.add_node("applier_node", applier_node)
    builder.add_node("skip_job_node", skip_job_node)

    builder.add_edge(START, "matcher_node")

    builder.add_conditional_edges(
        "matcher_node",
        route_by_match_score,
        {
            "applier_node": "applier_node",
            "skip_job_node": "skip_job_node",
        },
    )

    builder.add_edge("applier_node", END)
    builder.add_edge("skip_job_node", END)

    return builder.compile()