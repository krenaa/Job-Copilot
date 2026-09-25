import os
from typing import Any, Optional, Type
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

# Track authentication failures so we fail fast instead of stalling for 60 seconds
_GROQ_DISABLED = False
_GEMINI_DISABLED = False


def get_llm():
    """Returns primary LLM (Groq) if configured and valid, otherwise fallback (Google Gemini)."""
    global _GROQ_DISABLED, _GEMINI_DISABLED

    groq_api_key = os.getenv("GROQ_API_KEY")
    google_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

    # 1. Try Groq (Primary)
    if not _GROQ_DISABLED and groq_api_key and not groq_api_key.startswith("your_"):
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
    if not _GEMINI_DISABLED and google_api_key and not google_api_key.startswith("your_"):
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
    """Invokes primary Groq LLM with automatic fallback to Gemini, failing fast on auth errors."""
    global _GROQ_DISABLED, _GEMINI_DISABLED

    groq_api_key = os.getenv("GROQ_API_KEY")
    google_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

    # 1. Attempt with Groq (Primary)
    if not _GROQ_DISABLED and groq_api_key:
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
            err_str = str(groq_err)
            if "invalid_api_key" in err_str or "401" in err_str:
                _GROQ_DISABLED = True
                print("[!] Notice: GROQ_API_KEY is invalid/expired. Disabled for this session.")
            else:
                print(f"[!] Groq invocation failed ({groq_err}), switching to Gemini fallback...")

    # 2. Fallback to Gemini
    if not _GEMINI_DISABLED and google_api_key:
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
            err_str = str(gemini_err)
            if "401" in err_str or "UNAUTHENTICATED" in err_str:
                _GEMINI_DISABLED = True
                print("[!] Notice: GOOGLE_API_KEY is invalid/unauthenticated. Disabled for this session.")
            else:
                print(f"[!] Gemini fallback invocation failed: {gemini_err}")

    return None
