import os
from typing import Dict
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from src.state import AgentState, TailoredResume

load_dotenv()


def analyze_job_match(
    state: AgentState, llm=None
) -> Dict[str, TailoredResume | str]:
    """LangGraph node: Analyzes match between candidate profile and target job description."""
    raw_job = state["raw_job"]
    profile = state["candidate_profile"]

    # Fallback heuristic parser if no LLM instance is provided (useful for offline testing)
    if llm is None:
        required = set(s.lower() for s in raw_job.required_skills)
        candidate_skills = set(s.lower() for s in profile.get("skills", []))

        matched = list(required.intersection(candidate_skills))
        missing = list(required.difference(candidate_skills))

        score = (
            int((len(matched) / len(required)) * 100) if required else 80
        )

        tailored = TailoredResume(
            match_score=score,
            matching_keywords=matched,
            missing_keywords=missing,
            tailored_summary=f"Experienced developer matching key requirements: {', '.join(matched)}.",
            tailored_bullet_points=[
                f"Engineered scalable solutions leveraging {kw}."
                for kw in matched
            ],
        )
        return {
            "match_analysis": tailored,
            "application_status": "MATCH_COMPLETED",
        }

    # Structured prompt for LLM evaluation
    structured_llm = llm.with_structured_output(TailoredResume)

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are an expert ATS (Applicant Tracking System) career optimization agent. "
                "Analyze the candidate profile against the job posting. Compute an accurate match score (0-100), "
                "extract matching and missing keywords, craft a tailored professional summary, and write ATS-optimized bullet points.",
            ),
            (
                "human",
                "Job Title: {title}\n"
                "Company: {company}\n"
                "Job Description: {description}\n"
                "Required Skills: {skills}\n\n"
                "Candidate Profile:\n{candidate_profile}",
            ),
        ]
    )

    chain = prompt | structured_llm
    result = chain.invoke(
        {
            "title": raw_job.title,
            "company": raw_job.company,
            "description": raw_job.description,
            "skills": ", ".join(raw_job.required_skills),
            "candidate_profile": str(profile),
        }
    )

    return {"match_analysis": result, "application_status": "MATCH_COMPLETED"}