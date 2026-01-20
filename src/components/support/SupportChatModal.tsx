import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSupportChat } from "../../hooks/useSupportChat";
import type { SupportChatMessage } from "../../types/supportChat";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SupportChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: ReturnType<typeof useSupportChat>;

}

export const SupportChatModal: React.FC<SupportChatModalProps> = ({
  open,
  onOpenChange,
  chat,
}) => {
  const { messages, sendMessage, loading, error, endChat } = chat;
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);


  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // scroll to bottom when opening
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [open]);

    useEffect(() => {
    if (open) {
        requestAnimationFrame(() => {
        inputRef.current?.focus();
        });
    }
    }, [open]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages.length]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

    const handleSend = async () => {
    if (!canSend) return;

    const text = input.trim();
    setInput("");

    setTimeout(() => inputRef.current?.focus(), 0);

    await sendMessage(text);

    setTimeout(() => inputRef.current?.focus(), 0);
    };

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="p-0 gap-0 w-[min(95vw,480px)] max-w-none">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <DialogTitle className="text-base">Support</DialogTitle>
            <DialogDescription className="text-xs">
              Ask how to use Snipr or troubleshoot issues.
            </DialogDescription>
          </div>
        </div>

        <div className="px-4 py-4">
          <div
            ref={scrollRef}
            className="h-[340px] overflow-y-auto rounded-lg border bg-muted/30 p-3 space-y-3"
          >
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground">
                👋 Hi! Tell me what you’re trying to do and what screen you’re on.
              </div>
            )}

            {messages.map((msg: SupportChatMessage, index) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={index}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={[
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground border",
                    ].join(" ")}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-background border text-muted-foreground">
                  Typing…
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-2">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
        <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
            await endChat();
            }}
        >
            Clear
        </Button>
        </div>

          <div className="mt-3 flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a message…"
              className="h-10"
              disabled={loading}
            />
            <Button onClick={handleSend} disabled={!canSend} className="h-10">
              Send
            </Button>
          </div>

          <div className="mt-2 text-[11px] text-muted-foreground">
            Press Enter to send • Your chat is saved when you close this window.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
