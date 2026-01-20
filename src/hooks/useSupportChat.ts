import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supportChatClient } from "../lib/supportChatClient";
import { getAppUsername } from "../lib/getAppUsername";
import type { SupportChatMessage } from "../types/supportChat";

const UI_TTL_MS = 10 * 60 * 1000; // 10 minutes

const conversationIdKey = "supportChatConversationId";
const messagesKey = "supportChatMessages";
const lastActivityKey = "supportChatLastActivityAt";

export const useSupportChat = () => {
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const location = useLocation();

  const [conversationId, setConversationId] = useState<string | null>(
    localStorage.getItem(conversationIdKey)
  );

  // restore UI state for up to 10 minutes
  useEffect(() => {
    const last = Number(localStorage.getItem(lastActivityKey) || "0");
    const now = Date.now();

    if (last && now - last < UI_TTL_MS) {
      const saved = localStorage.getItem(messagesKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setMessages(parsed);
        } catch {}
      }
    } else {
      localStorage.removeItem(messagesKey);
      localStorage.removeItem(lastActivityKey);
    }
  }, []);

  // ensure conversationId exists
  useEffect(() => {
    if (!conversationId) {
      const newId = crypto.randomUUID();
      setConversationId(newId);
      localStorage.setItem(conversationIdKey, newId);
    }
  }, [conversationId]);

  // persist messages
  useEffect(() => {
    localStorage.setItem(messagesKey, JSON.stringify(messages));
  }, [messages]);

  const touchActivity = () => {
    localStorage.setItem(lastActivityKey, String(Date.now()));
  };

  const sendMessage = async (message: string) => {
    const username = getAppUsername() || "guest";

    setLoading(true);
    setError(null);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: message, ts: new Date().toISOString() },
    ]);
    touchActivity();

    try {
      const response = await supportChatClient.sendMessage({
        username,
        route: location.pathname,
        message,
        conversationId: conversationId ?? undefined,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply, ts: new Date().toISOString() },
      ]);
      touchActivity();
    } catch {
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const endChat = async () => {
    if (!conversationId) return;

    const username = getAppUsername() || "guest";

    try {
      await supportChatClient.endChat({ username, conversationId });
    } catch (err) {
      console.error("Failed to end chat:", err);
    } finally {
      localStorage.removeItem(conversationIdKey);
      localStorage.removeItem(messagesKey);
      localStorage.removeItem(lastActivityKey);

      setConversationId(null);
      setMessages([]);
    }
  };

  return { messages, sendMessage, loading, error, endChat };
};
