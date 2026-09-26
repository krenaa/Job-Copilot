from typing import List, Optional
from pydantic import BaseModel, Field
from typing_extensions import TypedDict


class InputState(BaseModel):
    job_description_text: str = Field(
        ..., description="Raw text of the target job description"
    )
    resume_text: str = Field(..., description="Raw text of candidate resume")


class GapAnalysisResult(BaseModel):
    missing: List[str] = Field(
        default_factory=list,
        description="Required skills/technologies not found in resume",
    )
    weak: List[str] = Field(
        default_factory=list,
        description="Mentioned briefly, lacking project/experience depth",
    )
    strong: List[str] = Field(
        default_factory=list,
        description="Clearly demonstrated skill matches backed by experience",
    )


class WeakImprovement(BaseModel):
    skill: str = Field(..., description="The skill identified as weak or missing")
    recommended_bullets: List[str] = Field(
        default_factory=list,
        description="High-impact resume bullet points demonstrating hands-on experience and metrics",
    )


class InterviewQuestion(BaseModel):
    question: str = Field(
        ..., description="A targeted technical interview question probing a skill gap"
    )
    targeted_skill: str = Field(..., description="The skill or gap being tested")
    suggested_talking_points: str = Field(
        ...,
        description="Strategic talking points on how to answer honestly and persuasively",
    )


class Tier1Insights(BaseModel):
    weak_improvements: List[WeakImprovement] = Field(default_factory=list)
    interview_questions: List[InterviewQuestion] = Field(default_factory=list)


class AgentState(TypedDict):
    jd_text: str
    resume_text: str
    extracted_jd_skills: List[str]
    extracted_candidate_skills: List[str]
    gap_analysis: Optional[GapAnalysisResult]
    user_feedback: Optional[str]
    final_output: Optional[GapAnalysisResult]
    insights: Optional[Tier1Insights]