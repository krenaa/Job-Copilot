from typing import Dict, List, Optional
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


class FormSubmissionDetails(BaseModel):
    full_name: str
    email: str
    phone: str
    linkedin_url: str
    github_url: str
    portfolio_url: str
    cover_letter: str


class AgentState(TypedDict):
    raw_job: JobPost
    candidate_profile: dict
    match_analysis: Optional[TailoredResume]
    form_details: Optional[FormSubmissionDetails]
    application_status: str
    error_logs: List[str]