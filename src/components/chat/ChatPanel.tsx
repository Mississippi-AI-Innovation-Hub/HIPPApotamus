"use client";

import { useState, useRef, useEffect, type FormEvent, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  /** The agent context: "contract", "vendor", or "global" */
  context: "contract" | "vendor" | "global";
  /** Optional context ID (baaId for contract, vendorId for vendor) */
  contextId?: string;
  /** Optional placeholder text for the input */
  placeholder?: string;
  /** Optional CSS class names for the outer container */
  className?: string;
}

// ─── SSE stream parser ──────────────────────────────────────────────────────

async function streamChat(
  context: string,
  messages: Array<{ role: string; content: string }>,
  contextId: string | undefined,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> {
  const response = await fetch(`/api/chat/${context}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, contextId }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: "Request failed" })) as { error?: string };
    onError(errorBody.error ?? `HTTP ${response.status}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError("No response stream available");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;

      const data = trimmed.slice(6);
      if (data === "[DONE]") {
        onDone();
        return;
      }

      try {
        const parsed = JSON.parse(data) as { content?: string };
        if (parsed.content) {
          onChunk(parsed.content);
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  onDone();
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ChatPanel({
  context,
  contextId,
  placeholder = "Ask a question...",
  className = "",
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamContentRef = useRef("");

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      setInput("");

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      streamContentRef.current = "";

      const historyForApi = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        await streamChat(
          context,
          historyForApi,
          contextId,
          (chunk) => {
            streamContentRef.current += chunk;
            const accumulated = streamContentRef.current;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, content: accumulated }
                  : m,
              ),
            );
          },
          () => {
            setIsStreaming(false);
          },
          (errMsg) => {
            setError(errMsg);
            setIsStreaming(false);
            // Remove the empty assistant message
            setMessages((prev) =>
              prev.filter((m) => m.id !== assistantMessage.id),
            );
          },
        );
      } catch {
        setError("Failed to connect to the AI service.");
        setIsStreaming(false);
        setMessages((prev) =>
          prev.filter((m) => m.id !== assistantMessage.id),
        );
      }
    },
    [input, isStreaming, messages, context, contextId],
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    setError(null);
    streamContentRef.current = "";
  }, []);

  return (
    <div
      className={`flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-teal-500" />
          <span className="text-sm font-medium text-slate-700">
            AI Assistant
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            disabled={isStreaming}
            className="text-xs text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-40"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "400px" }}>
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400">
            Start a conversation with the AI assistant.
          </p>
        )}

        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "ml-8 bg-slate-100 text-slate-800"
                  : "mr-8 bg-teal-50 text-teal-900"
              }`}
            >
              <p className="mb-0.5 text-xs font-medium opacity-60">
                {msg.role === "user" ? "You" : "Assistant"}
              </p>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === "assistant" && msg.content === "" && isStreaming && (
                <span className="inline-block animate-pulse text-teal-400">
                  Thinking...
                </span>
              )}
            </div>
          ))}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-slate-100 p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStreaming ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
