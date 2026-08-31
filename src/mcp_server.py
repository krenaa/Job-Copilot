import json
from mcp.server.fastmcp import FastMCP
from src.state import AgentState, JobPost
from src.workflow import build_agent_graph

# Initialize MCP server
mcp = FastMCP("Career-Copilot-MCP")
agent_graph = build_agent_graph()


@mcp.tool()
def analyze_and_apply_job(
    title: str,
    company: str,
    description: str,
    apply_url: str,
    required_skills: list[str],
    candidate_name: str,
    candidate_email: str,
    candidate_skills: list[str],
) -> str:
    """Evaluates ATS fit for a job posting and autonomously applies if match score >= 60%."""
    job = JobPost(
        title=title,
        company=company,
        description=description,
        apply_url=apply_url,
        required_skills=required_skills,
    )

    profile = {
        "name": candidate_name,
        "email": candidate_email,
        "skills": candidate_skills,
    }

    state: AgentState = {
        "raw_job": job,
        "candidate_profile": profile,
        "match_analysis": None,
        "form_details": None,
        "application_status": "SCOUTED",
        "error_logs": [],
    }

    result = agent_graph.invoke(state)

    summary = {
        "status": result.get("application_status"),
        "match_score": (
            result["match_analysis"].match_score
            if result.get("match_analysis")
            else None
        ),
        "missing_keywords": (
            result["match_analysis"].missing_keywords
            if result.get("match_analysis")
            else []
        ),
    }
    return json.dumps(summary, indent=2)


if __name__ == "__main__":
    mcp.run()