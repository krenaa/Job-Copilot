import asyncio
from typing import Dict
from playwright.async_api import async_playwright
from src.state import AgentState, FormSubmissionDetails


async def fill_application_form(
    apply_url: str, form_data: FormSubmissionDetails, headless: bool = False
) -> bool:
    """Automates form detection and entry using Playwright."""
    print(f"[*] Launching browser for application portal: {apply_url}")

    async with async_playwright() as p:
        # Launch non-headless browser so user can review the filled form
        browser = await p.chromium.launch(headless=headless, slow_mo=100)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            await page.goto(
                apply_url, wait_until="domcontentloaded", timeout=45000
            )

            # Common selector heuristics for ATS platforms (Lever, Greenhouse, etc.)
            field_mappings = [
                (
                    [
                        "input[name*='name' i]",
                        "input[id*='name' i]",
                        "input[placeholder*='name' i]",
                    ],
                    form_data.full_name,
                ),
                (
                    [
                        "input[type='email']",
                        "input[name*='email' i]",
                        "input[id*='email' i]",
                    ],
                    form_data.email,
                ),
                (
                    [
                        "input[type='tel']",
                        "input[name*='phone' i]",
                        "input[id*='phone' i]",
                    ],
                    form_data.phone,
                ),
                (
                    [
                        "input[name*='linkedin' i]",
                        "input[placeholder*='linkedin' i]",
                    ],
                    form_data.linkedin_url,
                ),
                (
                    [
                        "input[name*='github' i]",
                        "input[placeholder*='github' i]",
                    ],
                    form_data.github_url,
                ),
                (
                    [
                        "textarea[name*='comments' i]",
                        "textarea[name*='cover' i]",
                        "textarea[id*='additional' i]",
                    ],
                    form_data.cover_letter,
                ),
            ]

            for selectors, value in field_mappings:
                if not value:
                    continue
                for selector in selectors:
                    element = await page.query_selector(selector)
                    if element and await element.is_visible():
                        await element.fill(value)
                        print(f"  [+] Filled field matched by '{selector}'")
                        break

            print(
                "[*] Form pre-filled successfully. Pausing for human verification..."
            )
            # Give time for inspection during local testing
            await asyncio.sleep(3)
            await browser.close()
            return True

        except Exception as e:
            print(f"[!] Error while filling form: {e}")
            await browser.close()
            return False


def run_form_applier(state: AgentState) -> Dict[str, str]:
    """LangGraph node wrapper for application filling."""
    profile = state["candidate_profile"]
    analysis = state.get("match_analysis")

    cover_note = (
        analysis.tailored_summary
        if analysis
        else "I am eager to contribute my skills to your team."
    )

    form_data = FormSubmissionDetails(
        full_name=profile.get("name", "Applicant"),
        email=profile.get("email", "candidate@example.com"),
        phone=profile.get("phone", "+1234567890"),
        linkedin_url=profile.get("linkedin", "https://linkedin.com"),
        github_url=profile.get("github", "https://github.com"),
        portfolio_url=profile.get("portfolio", "https://example.com"),
        cover_letter=cover_note,
    )

    success = asyncio.run(
        fill_application_form(
            apply_url=state["raw_job"].apply_url,
            form_data=form_data,
            headless=True,
        )
    )

    if success:
        return {
            "form_details": form_data,
            "application_status": "APPLICATION_SUBMITTED",
        }
    return {"application_status": "APPLICATION_FAILED"}