import os
import json
from datetime import datetime
from typing import Any, Dict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
CHAT_LOG_DIR = os.path.join(BASE_DIR, "chat_logs")


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def _safe_username(u: str) -> str:
    u = (u or "guest").strip()
    return u if u.startswith("@") else f"@{u}"


def upsert_conversation_file(convo: Dict[str, Any], is_final: bool = False) -> str:
    """
    Writes/overwrites ONE file per conversation:
      chat_logs/<username>/<conversationId>.json

    - snapshots overwrite the same file
    - final save marks endedAt and overwrites the same file
    """
    username = _safe_username(convo.get("username") or "guest")
    convo_id = convo.get("conversationId") or "unknown"

    user_dir = os.path.join(CHAT_LOG_DIR, username)
    _ensure_dir(user_dir)

    path = os.path.join(user_dir, f"{convo_id}.json")

    safe_convo = dict(convo)
    safe_convo["messages"] = list(convo.get("messages", [])) 
    safe_convo["username"] = username
    safe_convo["conversationId"] = convo_id

    now = datetime.utcnow().isoformat()
    safe_convo.setdefault("startedAt", now)
    safe_convo["lastSavedAt"] = now
    safe_convo["isFinal"] = bool(is_final)

    if is_final and not safe_convo.get("endedAt"):
        safe_convo["endedAt"] = now

    with open(path, "w", encoding="utf-8") as f:
        json.dump(safe_convo, f, ensure_ascii=False, indent=2)

    return path


def save_transcript(convo: Dict[str, Any]) -> str:
    """Final save (Clear button / end endpoint)."""
    path = upsert_conversation_file(convo, is_final=True)
    print(f"✅ Final transcript saved: {path}")
    return path
