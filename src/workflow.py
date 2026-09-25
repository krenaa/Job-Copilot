import os
import re
from typing import Dict, List, Optional
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from langgraph.graph import END, START, StateGraph
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt

from src.state import AgentState, GapAnalysisResult
from src.llm import execute_llm_with_fallback

load_dotenv()


class ExtractedSkills(BaseModel):
    skills: List[str] = Field(
        default_factory=list,
        description="List of extracted skills, technologies, frameworks, and tools",
    )


def extract_skills_heuristic(text: str) -> List[str]:
    """Fallback text extractor when LLM key is absent or offline."""
    common_keywords = [
        "python", "fastapi", "docker", "kubernetes", "langgraph", "langchain",
        "react", "next.js", "typescript", "javascript", "postgresql", "sql",
        "mongodb", "redis", "celery", "playwright", "aws", "gcp", "azure",
        "git", "ci/cd", "graphql", "rest api", "linux", "machine learning",
        "llm", "rag", "pytorch", "tensorflow"
    ]
    lower_text = text.lower()
    found = []
    for kw in common_keywords:
        pattern = r"\b" + re.escape(kw) + r"\b"
        if re.search(pattern, lower_text):
            found.append(kw.title())
    return found


def extract_jd_node(state: AgentState) -> dict:
    """Node 1: Extract core requirements, technologies, and experience from the JD."""
    jd_text = state.get("jd_text", "")

    # Attempt LLM extraction (Groq primary / Gemini fallback)
    messages = [
        (
            "system",
            "You are an expert technical recruiter. Extract all required core technical skills, "
            "programming languages, frameworks, databases, and tools from the job description.",
        ),
        ("human", f"Job Description:\n{jd_text}"),
    ]
    llm_result = execute_llm_with_fallback(
        messages=messages, structured_schema=ExtractedSkills
    )

    if llm_result and hasattr(llm_result, "skills") and llm_result.skills:
        extracted = llm_result.skills
    else:
        extracted = extract_skills_heuristic(jd_text)
        if not extracted and jd_text.strip():
            words = [
                w.strip(",.- ")
                for w in jd_text.split()
                if len(w) > 3 and w.istitle()
            ]
            extracted = list(dict.fromkeys(words))[:8]

    return {"extracted_jd_skills": extracted}


def extract_resume_node(state: AgentState) -> dict:
    """Node 2: Extract demonstrated candidate skills and experience from the resume text."""
    resume_text = state.get("resume_text", "")

    # Attempt LLM extraction (Groq primary / Gemini fallback)
    messages = [
        (
            "system",
            "You are an expert technical resume reviewer. Extract all technical skills, languages, "
            "frameworks, tools, and platforms demonstrated in the candidate's resume.",
        ),
        ("human", f"Resume Text:\n{resume_text}"),
    ]
    llm_result = execute_llm_with_fallback(
        messages=messages, structured_schema=ExtractedSkills
    )

    if llm_result and hasattr(llm_result, "skills") and llm_result.skills:
        extracted = llm_result.skills
    else:
        extracted = extract_skills_heuristic(resume_text)
        if not extracted and resume_text.strip():
            words = [
                w.strip(",.- ")
                for w in resume_text.split()
                if len(w) > 3 and w.istitle()
            ]
            extracted = list(dict.fromkeys(words))[:8]

    return {"extracted_candidate_skills": extracted}


def compare_node(state: AgentState) -> dict:
    """Node 3: Compares JD vs Resume and buckets skills into Missing, Weak, and Strong."""
    jd_skills = state.get("extracted_jd_skills", [])
    candidate_skills = state.get("extracted_candidate_skills", [])
    jd_text = state.get("jd_text", "")
    resume_text = state.get("resume_text", "")

    # Attempt LLM comparative gap analysis (Groq primary / Gemini fallback)
    messages = [
        (
            "system",
            "You are an ATS Gap Analysis Engine. Compare the required Job Description skills against the candidate's resume.\n"
            "Categorize every required skill into exactly one of three buckets:\n"
            "1. 'missing': Required by JD but not present in the resume.\n"
            "2. 'weak': Mentioned in passing or listed in skills, but lacking project depth, metrics, or substantive experience.\n"
            "3. 'strong': Clearly demonstrated match backed by hands-on experience or shipped projects.\n"
            "Do not include percentages or scores. Return only the categorized lists.",
        ),
        (
            "human",
            f"Required Skills:\n{jd_skills}\n\nJob Description:\n{jd_text}\n\n"
            f"Candidate Skills:\n{candidate_skills}\n\nCandidate Resume:\n{resume_text}",
        ),
    ]
    llm_result = execute_llm_with_fallback(
        messages=messages, structured_schema=GapAnalysisResult
    )

    if (
        llm_result
        and isinstance(llm_result, GapAnalysisResult)
        and (llm_result.missing or llm_result.weak or llm_result.strong)
    ):
        gap_result = llm_result
    else:
        # Deterministic heuristic fallback
        jd_set = {s.lower(): s for s in jd_skills}
        cand_set = {s.lower(): s for s in candidate_skills}
        resume_lower = resume_text.lower()

        missing: List[str] = []
        weak: List[str] = []
        strong: List[str] = []

        for lower_skill, orig_skill in jd_set.items():
            if lower_skill not in cand_set:
                missing.append(orig_skill)
            else:
                count = len(
                    re.findall(r"\b" + re.escape(lower_skill) + r"\b", resume_lower)
                )
                has_action_verbs = any(
                    verb in resume_lower
                    for verb in [
                        "built", "engineered", "deployed", "scaled", "designed", "led", "developed"
                    ]
                )
                if count > 1 or has_action_verbs:
                    strong.append(orig_skill)
                else:
                    weak.append(orig_skill)

        gap_result = GapAnalysisResult(
            missing=missing,
            weak=weak,
            strong=strong,
        )

    return {"gap_analysis": gap_result}


def hitl_review_node(state: AgentState) -> dict:
    """Node 4: Pauses execution with interrupt() for Human-in-the-Loop review and adjustment."""
    current_analysis = state.get("gap_analysis")
    review_data = (
        current_analysis.model_dump()
        if hasattr(current_analysis, "model_dump")
        else current_analysis
    )

    # Graph execution suspends here until resumed with Command(resume=...)
    user_feedback = interrupt({
        "review_data": review_data,
        "message": "Human-in-the-Loop Review: Confirm or provide adjustments for the gap analysis.",
    })

    return {"user_feedback": str(user_feedback) if user_feedback is not None else ""}


def finalize_node(state: AgentState) -> dict:
    """Node 5: Applies user adjustments (if any) and finalizes the output."""
    gap: Optional[GapAnalysisResult] = state.get("gap_analysis")
    user_feedback = state.get("user_feedback", "")

    if not gap:
        gap = GapAnalysisResult(missing=[], weak=[], strong=[])

    missing = list(gap.missing)
    weak = list(gap.weak)
    strong = list(gap.strong)

    # Process user adjustments if provided (e.g., "move Docker to strong", "add K8s to strong")
    if user_feedback and isinstance(user_feedback, str):
        feedback_lower = user_feedback.lower()
        # Check for moves to strong
        for skill in list(missing + weak):
            if f"to strong" in feedback_lower and skill.lower() in feedback_lower:
                if skill in missing:
                    missing.remove(skill)
                if skill in weak:
                    weak.remove(skill)
                if skill not in strong:
                    strong.append(skill)
        # Check for moves to weak
        for skill in list(missing):
            if f"to weak" in feedback_lower and skill.lower() in feedback_lower:
                missing.remove(skill)
                if skill not in weak:
                    weak.append(skill)

    final_result = GapAnalysisResult(
        missing=missing,
        weak=weak,
        strong=strong,
    )
    return {"final_output": final_result}


def build_gap_analyzer_graph(checkpointer=None):
    """Constructs the Phase B/C LangGraph state machine with MemorySaver."""
    builder = StateGraph(AgentState)

    builder.add_node("extract_jd_node", extract_jd_node)
    builder.add_node("extract_resume_node", extract_resume_node)
    builder.add_node("compare_node", compare_node)
    builder.add_node("hitl_review_node", hitl_review_node)
    builder.add_node("finalize_node", finalize_node)

    builder.add_edge(START, "extract_jd_node")
    builder.add_edge("extract_jd_node", "extract_resume_node")
    builder.add_edge("extract_resume_node", "compare_node")
    builder.add_edge("compare_node", "hitl_review_node")
    builder.add_edge("hitl_review_node", "finalize_node")
    builder.add_edge("finalize_node", END)

    if checkpointer is None:
        checkpointer = MemorySaver()

    return builder.compile(checkpointer=checkpointer)