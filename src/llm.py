import os
from typing import Any, Optional, Type
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


def get_llm():
    """Returns primary LLM (Groq) if configured and valid, otherwise fallback (Google Gemini)."""
    groq_api_key = os.getenv("GROQ_API_KEY")
    google_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

    # 1. Try Groq (Primary)
    if groq_api_key and not groq_api_key.startswith("your_"):
        try:
            from langchain_groq import ChatGroq

            return ChatGroq(
                model="llama-3.3-70b-versatile",
                groq_api_key=groq_api_key,
                temperature=0.1,
                max_retries=1,
            )
        except Exception as e:
            print(f"[!] Warning: Failed initializing Groq client: {e}")

    # 2. Try Google Gemini (Fallback)
    if google_api_key and not google_api_key.startswith("your_"):
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI

            return ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=google_api_key,
                temperature=0.1,
                max_retries=1,
            )
        except Exception as e:
            print(f"[!] Warning: Failed initializing Gemini client: {e}")

    return None


def execute_llm_with_fallback(
    messages: list,
    structured_schema: Optional[Type[BaseModel]] = None,
) -> Optional[Any]:
    """Invokes primary Groq LLM with automatic fallback to Gemini if an error occurs."""
    groq_api_key = os.getenv("GROQ_API_KEY")
    google_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

    # 1. Attempt with Groq (Primary)
    if groq_api_key:
        try:
            from langchain_groq import ChatGroq

            groq_llm = ChatGroq(
                model="llama-3.3-70b-versatile",
                groq_api_key=groq_api_key,
                temperature=0.1,
                max_retries=1,
            )
            model_to_call = (
                groq_llm.with_structured_output(structured_schema)
                if structured_schema
                else groq_llm
            )
            result = model_to_call.invoke(messages)
            return result
        except Exception as groq_err:
            print(f"[!] Groq invocation failed ({groq_err}), switching to Gemini fallback...")

    # 2. Fallback to Gemini
    if google_api_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI

            gemini_llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=google_api_key,
                temperature=0.1,
                max_retries=1,
            )
            model_to_call = (
                gemini_llm.with_structured_output(structured_schema)
                if structured_schema
                else gemini_llm
            )
            result = model_to_call.invoke(messages)
            return result
        except Exception as gemini_err:
            print(f"[!] Gemini fallback invocation failed: {gemini_err}")

    return None
