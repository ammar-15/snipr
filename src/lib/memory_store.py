from datetime import datetime
from collections import deque
import threading

INACTIVITY_TIMERS = {}
INACTIVITY_SECONDS = 30

from .transcripts import upsert_conversation_file

# In-memory store for conversations
memory_store = {}

# Maximum number of messages to keep per conversation
MAX_MESSAGES = 50

def get_or_create_convo(conversation_id, username):

    if conversation_id not in memory_store:
        now = datetime.utcnow().isoformat()
        memory_store[conversation_id] = {
            "conversationId": conversation_id,  
            "messages": deque(maxlen=MAX_MESSAGES),
            "summary": "",
            "routeHistory": [],
            "startedAt": now,
            "lastUpdatedAt": now,
            "unknownCount": 0,
            "endedAt": None,                    
            "username": username,
        }
    return memory_store[conversation_id]


def append_message(conversation_id, role, content, route=None):
    convo = memory_store.get(conversation_id)
    if not convo:
        raise ValueError(f"Conversation {conversation_id} does not exist.")

    ts = datetime.utcnow().isoformat()

    convo["messages"].append({
        "role": role,
        "content": content,
        "ts": ts,
    })

    if route:
        convo["routeHistory"].append({"route": route, "ts": ts})

    convo["lastUpdatedAt"] = ts

    reset_inactivity_timer(conversation_id)


def _snapshot_if_still_idle(conversation_id: str, scheduled_last_updated_at: str):
    convo = memory_store.get(conversation_id)
    if not convo:
        return

    if convo.get("lastUpdatedAt") != scheduled_last_updated_at:
        return

    if convo.get("lastSnapshotAt") == scheduled_last_updated_at:
        return

    convo["lastSnapshotAt"] = scheduled_last_updated_at

    safe_convo = dict(convo)
    safe_convo["messages"] = list(convo.get("messages", []))  # deque -> list
    safe_convo["snapshotAt"] = datetime.utcnow().isoformat()
    safe_convo["isSnapshot"] = True

    upsert_conversation_file(safe_convo, is_final=False)
    print(f"✅ Snapshot saved for convo={conversation_id}")


def reset_inactivity_timer(conversation_id: str):
    timer = INACTIVITY_TIMERS.get(conversation_id)
    if timer:
        timer.cancel()

    convo = memory_store.get(conversation_id)
    if not convo:
        return

    scheduled_last = convo.get("lastUpdatedAt")

    timer = threading.Timer(
        INACTIVITY_SECONDS,
        _snapshot_if_still_idle,
        args=[conversation_id, scheduled_last],
    )

    INACTIVITY_TIMERS[conversation_id] = timer
    timer.start()


def end_convo(conversation_id):
    timer = INACTIVITY_TIMERS.pop(conversation_id, None)
    if timer:
        timer.cancel()
    return memory_store.pop(conversation_id, None)