import os
from dotenv import load_dotenv
from groq import Groq
from langchain_groq import ChatGroq
from src.matcher import analyze_job_match
from src.state import AgentState, JobPost

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    print("[!] GROQ_API_KEY not found in .env")
    exit(1)

# 1. Fetch available chat model IDs
client = Groq(api_key=api_key)
available_models = [
    m.id
    for m in client.models.list().data
    if not any(x in m.id for x in ["whisper", "guard", "vision"])
]

print(f"[*] Available Chat Models on your key: {available_models}")

if not available_models:
    print("[!] No suitable chat models found on this key.")
    exit(1)

# Pick the primary model (e.g. llama-3.1-8b-instant, mixtral-8x7b-32768, or first available)
chosen_model = (
    "llama-3.1-8b-instant"
    if "llama-3.1-8b-instant" in available_models
    else available_models[0]
)
print(f"[*] Using model: {chosen_model}")

# 2. Run LangChain Matcher Test
llm = ChatGroq(model=chosen_model, groq_api_key=api_key, temperature=0.1)

job = JobPost(
    title="AI Engineer",
    company="Shivay Intelligence",
    description="Develop agentic workflows and integrate LangGraph pipelines with FastAPI.",
    apply_url="https://example.com/apply/ai-eng",
    required_skills=["Python", "FastAPI", "LangGraph", "Docker"],
)

profile = {
    "name": "Krena Patel",
    "title": "Software Developer",
    "skills": ["Python", "FastAPI", "Docker", "React", "PostgreSQL"],
    "experience": "Built full-stack applications, MCP servers, and autonomous agent pipelines.",
}

initial_state: AgentState = {
    "raw_job": job,
    "candidate_profile": profile,
    "match_analysis": None,
    "application_status": "SCOUTED",
    "error_logs": [],
}

print("[*] Invoking Live LLM with Structured Output...")
update = analyze_job_match(initial_state, llm=llm)
initial_state.update(update)

print("\n--- Live Output ---")
analysis = initial_state["match_analysis"]
print(f"Match Score: {analysis.match_score}%")
print(f"Matched Skills: {analysis.matching_keywords}")
print(f"Missing Skills: {analysis.missing_keywords}")
print(f"Tailored Summary:\n{analysis.tailored_summary}")
print("\nTailored Bullet Points:")
for bp in analysis.tailored_bullet_points:
    print(f"- {bp}")
print("\n[SUCCESS] Model execution verified!")