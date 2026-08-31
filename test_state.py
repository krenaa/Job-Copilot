import os
import sys
from dotenv import load_dotenv
from groq import Groq
from langchain_groq import ChatGroq
from src.matcher import analyze_job_match
from src.state import AgentState, JobPost

load_dotenv()


def run_test():
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        print("[!] Error: GROQ_API_KEY not found in .env")
        sys.exit(1)

    # 1. Fetch live available models for this specific API key
    client = Groq(api_key=groq_api_key)
    try:
        models_data = client.models.list().data
        available_models = [
            m.id
            for m in models_data
            if not any(
                skip in m.id.lower()
                for skip in ["whisper", "guard", "vision", "embed"]
            )
        ]
    except Exception as e:
        print(f"[!] Authentication/Connection failed: {e}")
        sys.exit(1)

    if not available_models:
        print("[!] No active text models found for this Groq key.")
        sys.exit(1)

    # 2. Select model (llama-3.3-70b-versatile, llama-3.1-8b-instant, or first available)
    preferred_models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
    chosen_model = next(
        (m for m in preferred_models if m in available_models),
        available_models[0],
    )

    print(f"[*] Available models on account: {available_models}")
    print(f"[*] Selected active model: {chosen_model}")

    # 3. Instantiate LangChain ChatGroq instance
    llm = ChatGroq(
        model=chosen_model,
        groq_api_key=groq_api_key,
        temperature=0.1,
    )

    # 4. Define candidate test payload
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
    try:
        update = analyze_job_match(initial_state, llm=llm)
        initial_state.update(update)
    except Exception as e:
        print(f"[!] Structured Output Execution Error: {e}")
        sys.exit(1)

    # 5. Output Verification
    print("\n--- Live LLM Output ---")
    analysis = initial_state.get("match_analysis")
    if analysis:
        print(f"Match Score: {analysis.match_score}%")
        print(f"Matched Skills: {analysis.matching_keywords}")
        print(f"Missing Skills: {analysis.missing_keywords}")
        print(f"Tailored Summary:\n{analysis.tailored_summary}")
        print("\nTailored Bullet Points:")
        for bp in analysis.tailored_bullet_points:
            print(f"- {bp}")
        print("\n[SUCCESS] Live model execution & structured output verified!")


if __name__ == "__main__":
    run_test()