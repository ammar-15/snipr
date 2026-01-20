import React, { useState } from "react";
import { SupportChatModal } from "./SupportChatModal";
import { useSupportChat } from "../../hooks/useSupportChat";

export const SupportChatWidget: React.FC = () => {
  const [open, setOpen] = useState(false);

  const chat = useSupportChat(); 

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 rounded-full shadow-lg h-12 px-4 bg-primary text-primary-foreground"
      >
        Support
      </button>

      <SupportChatModal
        open={open}
        onOpenChange={setOpen}
        chat={chat}
      />
    </>
  );
};
