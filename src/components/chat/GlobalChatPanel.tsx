"use client";

import { useState, useCallback } from "react";
import ChatPanel from "@/components/chat/ChatPanel";

const QUICK_PROMPTS = [
  "Summarize all expiring contracts",
  "What needs attention?",
  "Show recent activity",
] as const;

export default function GlobalChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [quickPrompt, setQuickPrompt] = useState<string | null>(null);

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
    setQuickPrompt(null);
  }, []);

  const handleQuickPrompt = useCallback((prompt: string) => {
    setQuickPrompt(prompt);
  }, []);

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={togglePanel}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0F766E] text-white shadow-lg transition-all hover:bg-[#0D6560] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E]/30 focus:ring-offset-2"
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
      >
        {isOpen ? (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
      </button>

      {/* Expandable panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 animate-in slide-in-from-bottom-4">
          {/* Quick prompts */}
          {!quickPrompt && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="rounded-full border border-[#0F766E]/20 bg-white px-3 py-1.5 text-xs text-[#0F766E] transition-colors hover:bg-[#CCFBF1]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <ChatPanel
            context="global"
            placeholder={quickPrompt ?? "Ask the coordinator..."}
            className="h-[480px]"
          />
        </div>
      )}
    </>
  );
}
