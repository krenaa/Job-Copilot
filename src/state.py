from typing import List, Optional
from pydantic import BaseModel, Field
from typing_extensions import TypedDict


class JobPost(BaseModel):
    title: str
    company: str
    description: str
    apply_url: str
    required_skills: List[str] = Field(default_factory=list)


class TailoredResume(BaseModel):
    match_score: int = Field(
        ...,
        description="Fit score from 0-100 based on required vs candidate skills",
    )
    matching_keywords: List[str]
    missing_keywords: List[str]
    tailored_summary: str
    tailored_bullet_points: List[str]


class AgentState(TypedDict):
    raw_job: JobPost
    candidate_profile: dict
    match_analysis: Optional[TailoredResume]
    application_status: str
    error_logs: List[str]