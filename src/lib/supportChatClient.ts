const baseUrl = import.meta.env.VITE_API_URL;

export const supportChatClient = {
  async sendMessage(payload: any) {
    const res = await fetch(`${baseUrl}/api/support/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Support chat request failed");
    return res.json();
  },

  async endChat(payload: any) {
    const res = await fetch(`${baseUrl}/api/support/chat/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("End chat failed");
    return res.json();
  },
};
