import os
import json
from openai import OpenAI
import re

from .knowledge_loader import get_knowledge
from .memory_store import get_or_create_convo, append_message

SUPPORT_EMAIL = "ammukuul15@gmail.com"

def build_system_prompt():
    kb = get_knowledge()
    return (
        "You are a friendly in-app support assistant for the Snipr web app.\n\n"
        "STYLE RULES (MUST FOLLOW):\n"
        "- Speak in simple, non-technical, everyday language. Keep it short.\n"
        "- NEVER mention internal URLs, routes, or path names (examples: '/user', '/your-snipes', '/dashboard').\n"
        "- Instead, describe where it is on the screen using UI location words like: "
        "'top left', 'top right', 'header', 'sidebar', 'menu', 'profile icon', 'settings', 'button'.\n"
        "- If something is not in the knowledge base, say it doesn't exist yet and set missing_feature=true.\n"
        "- The JSON format is for the backend only. The 'reply' must be plain English only (no JSON text).\n\n"
        "OUTPUT FORMAT (STRICT):\n"
        "Return valid JSON ONLY in this exact shape:\n"
        '{ "reply":"...", "missing_feature":false, "feature_request": { "title":"", "description":"" } }\n\n'
        "KNOWLEDGE BASE (authoritative):\n"
        f"{kb}"
    )

def _strip_json_leaks(text: str) -> str:
    return re.sub(r"\{[\s\S]*\}\s*$", "", text).strip()

def _is_unknown_reply(parsed: dict) -> bool:
    if parsed.get("missing_feature") is True:
        return True
    r = (parsed.get("reply") or "").lower()
    triggers = [
        "doesn't exist", "does not exist", "isn't available", "not available",
        "can't find", "i don’t see", "i don't see", "not sure", "i'm not sure",
        "no specific", "not a feature"
    ]
    return any(t in r for t in triggers)

def support_chat(username, route, message, conversation_id):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "reply": "Server misconfiguration: OpenAI key is missing. Please contact the admin.",
            "missing_feature": False,
            "feature_request": {"title": "", "description": ""},
        }

    client = OpenAI(api_key=api_key)

    convo = get_or_create_convo(conversation_id, username)

    # store user message + resets snapshot timer in memory_store
    append_message(conversation_id, "user", message, route=route)

    system_prompt = build_system_prompt()

    recent = list(convo["messages"])[-50:]
    chat_messages = [{"role": "system", "content": system_prompt}]
    chat_messages += [{"role": m["role"], "content": m["content"]} for m in recent]

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=chat_messages,
            temperature=0.2,
        )

        content = (resp.choices[0].message.content or "").strip()

        # parse strict JSON
        parsed = None
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {
                "reply": content,
                "missing_feature": False,
                "feature_request": {"title": "", "description": ""},
            }

        # sanitize reply (never show JSON blob)
        parsed["reply"] = _strip_json_leaks(parsed.get("reply", ""))

        # increment unknownCount if needed
        if _is_unknown_reply(parsed):
            convo["unknownCount"] = (convo.get("unknownCount") or 0) + 1

        # escalate after 2 unknowns
        if (convo.get("unknownCount") or 0) >= 2:
            parsed["reply"] = (
                parsed["reply"].rstrip()
                + f"\n\nIf you still need help, email support at {SUPPORT_EMAIL} and let me know what the issue is ^_^."
            )

        # store assistant reply
        append_message(conversation_id, "assistant", parsed.get("reply", ""))

        return {
            "reply": parsed.get("reply", ""),
            "missing_feature": bool(parsed.get("missing_feature", False)),
            "feature_request": parsed.get("feature_request", {"title": "", "description": ""}),
        }

    except Exception as e:
        print("❌ OpenAI support_chat error:", repr(e))
        return {
            "reply": "I’m having trouble reaching the AI service right now. Please try again.",
            "missing_feature": False,
            "feature_request": {"title": "", "description": ""},
        }