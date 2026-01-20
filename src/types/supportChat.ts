export type SupportChatRole = "user" | "assistant";

export interface SupportChatMessage {
  role: SupportChatRole;
  content: string;
  ts?: string; // optional timestamp
}
