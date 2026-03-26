"use client";

import { useRouter } from "next/navigation";
import { useRef, useEffect, useState, useCallback, type KeyboardEvent } from "react";

// ─── Quick actions ──────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label: "Compliance overview",
    prompt:
      "Give me a compliance overview — how many contracts are active, expiring, expired, and pending?",
  },
  {
    label: "Expiring contracts",
    prompt:
      "Which BAAs are expiring soon? Show me the details and suggest actions.",
  },
  {
    label: "Send reminders",
    prompt:
      "Are there any vendors that need renewal reminders sent?",
  },
  {
    label: "Recent activity",
    prompt:
      "Show me recent activity — what happened in the last few days?",
  },
] as const;

// ─── Helper: render simple markdown-like text ───────────────────────────────

function renderMarkdownText(text: string) {
  // Split into lines and process
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="my-1.5 ml-4 list-disc space-y-0.5">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // List items
    if (/^[-*]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      continue;
    }
    // Numbered list items
    if (/^\d+\.\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s+/, ""));
      continue;
    }

    flushList();

    // Empty line
    if (trimmed === "") {
      elements.push(<br key={`br-${i}`} />);
      continue;
    }

    // Heading-like text (### or ##)
    if (/^#{1,3}\s+/.test(trimmed)) {
      const headingText = trimmed.replace(/^#{1,3}\s+/, "");
      elements.push(
        <p key={`h-${i}`} className="mt-2 mb-1 text-sm font-semibold text-foreground">
          {renderInlineMarkdown(headingText)}
        </p>,
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed">
        {renderInlineMarkdown(trimmed)}
      </p>,
    );
  }

  flushList();
  return <>{elements}</>;
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

// ─── Tool rendering sub-components ──────────────────────────────────────────

interface ToolPartProps {
  toolName: string;
  toolCallId: string;
  state: string;
  input: unknown;
  output: unknown;
  approval?: { id: string; approved?: boolean; reason?: string };
  onApprove: (approvalId: string) => void;
  onDeny: (approvalId: string) => void;
  onNavigate: (path: string) => void;
}

function ToolPartRenderer({
  toolName,
  toolCallId,
  state,
  input,
  output,
  approval,
  onApprove,
  onDeny,
  onNavigate,
}: ToolPartProps) {
  const args = (input ?? {}) as Record<string, unknown>;
  const result = output as Record<string, unknown> | undefined;

  // navigateTo tool
  if (toolName === "navigateTo") {
    const path = (args.path as string) ?? "/";
    const label = (args.label as string) ?? "Go to page";
    return (
      <button
        onClick={() => onNavigate(path)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        {label}
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </button>
    );
  }

  // sendReminder tool — approval flow
  if (toolName === "sendReminder") {
    const vendorName = (args.vendorName as string) ?? "Unknown vendor";
    const vendorEmail = (args.vendorEmail as string) ?? "";

    if (state === "approval-requested" && approval?.id) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">
            Send reminder to {vendorName}?
          </p>
          {vendorEmail && (
            <p className="text-xs text-amber-700 mt-1">
              Email: {vendorEmail}
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onApprove(approval.id)}
              className="rounded px-3 py-1 text-xs font-medium text-white transition-colors hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)" }}
            >
              Approve &amp; Send
            </button>
            <button
              onClick={() => onDeny(approval.id)}
              className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (state === "approval-responded") {
      return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <p className="text-xs text-slate-500">
            {approval?.approved
              ? `Reminder sent to ${vendorName}`
              : `Reminder to ${vendorName} was cancelled`}
          </p>
        </div>
      );
    }

    if (state === "output-available" && result) {
      return (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
          <div className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <p className="text-xs font-medium text-emerald-700">
              Reminder sent to {vendorName}
            </p>
          </div>
        </div>
      );
    }

    // Loading state
    return (
      <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-2.5">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
          <p className="text-xs text-amber-600">Preparing reminder for {vendorName}...</p>
        </div>
      </div>
    );
  }

  // getComplianceOverview tool
  if (toolName === "getComplianceOverview") {
    if (state === "output-available" && result) {
      const data = result as Record<string, unknown>;
      const stats = [
        { label: "Active", value: data.active ?? data.activeCount ?? "—", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
        { label: "Expiring", value: data.expiring ?? data.expiringCount ?? "—", color: "text-amber-700 bg-amber-50 border-amber-200" },
        { label: "Expired", value: data.expired ?? data.expiredCount ?? "—", color: "text-red-700 bg-red-50 border-red-200" },
        { label: "Pending", value: data.pending ?? data.pendingCount ?? "—", color: "text-blue-700 bg-blue-50 border-blue-200" },
      ];
      return (
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className={`rounded-lg border p-2.5 ${stat.color}`}>
              <p className="text-xs font-medium opacity-70">{stat.label}</p>
              <p className="text-lg font-bold">{String(stat.value)}</p>
            </div>
          ))}
        </div>
      );
    }
    return <ToolLoadingIndicator label="Looking up compliance data" />;
  }

  // getRecentActivity tool
  if (toolName === "getRecentActivity") {
    if (state === "output-available" && result) {
      const activities = Array.isArray(result) ? result : (result as Record<string, unknown>).activities;
      if (Array.isArray(activities) && activities.length > 0) {
        return (
          <div className="space-y-1.5">
            {(activities as Array<Record<string, unknown>>).slice(0, 5).map((activity, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-border/50 bg-background p-2">
                <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground">{String(activity.description ?? activity.action ?? activity.message ?? "Activity")}</p>
                  {"timestamp" in activity && activity.timestamp ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{String(activity.timestamp)}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        );
      }
    }
    return <ToolLoadingIndicator label="Looking up recent activity" />;
  }

  // Generic tool handling (getBAADetails, getVendorDetails, searchContracts, etc.)
  if (state === "output-available") {
    return (
      <div className="rounded-lg border border-border/50 bg-background p-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Looked up: {formatToolName(toolName)}
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-2">
        <p className="text-xs text-red-600">Failed to execute {formatToolName(toolName)}</p>
      </div>
    );
  }

  // Loading / in-progress for all other tools
  return <ToolLoadingIndicator label={`Looking up ${formatToolName(toolName)}`} />;
}

function ToolLoadingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-background p-2">
      <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      <p className="text-xs text-muted-foreground">{label}...</p>
    </div>
  );
}

function formatToolName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ─── Pulsing dots loader ────────────────────────────────────────────────────

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" />
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function AgenticChatPanel() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");

  interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    toolInvocations?: Array<{ toolCallId: string; toolName: string; args: Record<string, unknown>; state: string; result?: unknown }>;
  }

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: text };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMsgs.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      // Read the streaming response
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantId = `assistant-${Date.now()}`;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(l => l.trim());

        for (const line of lines) {
          // Handle data stream format: "0:text" for text chunks
          if (line.startsWith("0:")) {
            try {
              const text = JSON.parse(line.slice(2));
              assistantContent += text;
              setMessages(prev => {
                const existing = prev.find(m => m.id === assistantId);
                if (existing) {
                  return prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { id: assistantId, role: "assistant" as const, content: assistantContent }];
              });
            } catch { /* skip non-JSON lines */ }
          }
        }
      }

      // If no content was streamed, add empty assistant message
      if (!assistantContent) {
        setMessages(prev => {
          if (!prev.find(m => m.id === assistantId)) {
            return [...prev, { id: assistantId, role: "assistant" as const, content: "I processed your request but had no text response." }];
          }
          return prev;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, []);

  // Submit handler
  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    sendMessage(trimmed);
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [inputValue, isLoading, sendMessage]);

  // Quick action handler
  const handleQuickAction = useCallback(
    (prompt: string) => {
      if (isLoading) return;
      sendMessage(prompt);
    },
    [isLoading, sendMessage],
  );

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Navigation handler
  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-5">
        {!hasMessages ? (
          /* Empty state: show quick actions */
          <div className="animate-fade-in-up">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Quick actions
            </p>
            <div className="space-y-2">
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={isLoading}
                  className={`animate-fade-in-up stagger-${i + 1} flex w-full items-start gap-3 rounded-xl border border-border/50 bg-background p-3.5 text-left transition-all duration-150 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <svg
                      className="h-4 w-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {action.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {action.prompt}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Try asking chips */}
            <p className="mb-2.5 mt-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Try asking
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "Which BAAs expire this month?",
                "Summarize all contracts",
                "What needs my attention?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickAction(prompt)}
                  disabled={isLoading}
                  className="rounded-full border border-border bg-background px-3.5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:border-primary hover:bg-primary/5 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          <div className="space-y-4">
            {messages.map((message: any) => (
              <MessageBubble
                key={message.id}
                message={message}
                onNavigate={handleNavigate}
              />
            ))}

            {/* Loading indicator */}
            {isLoading && <ThinkingIndicator />}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-5 mb-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <span className="flex-1 text-xs">{error.message || "Something went wrong"}</span>
          <button onClick={() => {}} className="text-xs font-medium text-red-800 underline hover:text-red-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Chat input */}
      <div className="border-t border-border p-5">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask HIPAA Copilot anything..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputValue.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition-all duration-150 hover:opacity-90 hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
            }}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg
                className="h-4.5 w-4.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Message bubble ─────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: { id: string; role: string; content: string; toolInvocations?: Array<{ toolCallId: string; toolName: string; args: Record<string, unknown>; state: string; result?: unknown }> };
  onNavigate: (path: string) => void;
}

function MessageBubble({ message, onNavigate }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-slate-100 text-slate-800"
            : "border border-border/50 bg-white text-foreground shadow-sm"
        }`}
      >
        {/* Text content */}
        {message.content && (
          <div className="prose-sm">
            {renderMarkdownText(message.content)}
          </div>
        )}

        {/* Tool invocations */}
        {message.toolInvocations?.map((toolInvocation) => {
          const { toolCallId, toolName, args, state, result } = toolInvocation;

          // navigateTo — show clickable link
          if (toolName === "navigateTo") {
            const a = args as { path?: string; label?: string };
            return (
              <button
                key={toolCallId}
                onClick={() => onNavigate(String(a.path ?? "/dashboard"))}
                className="my-1 inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                {String(a.label ?? "Go to page")}
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            );
          }

          // sendReminder — show result
          if (toolName === "sendReminder" && state === "result") {
            const r = result as { success?: boolean; message?: string; error?: string } | null;
            return (
              <div key={toolCallId} className={`my-2 rounded-lg border p-2.5 text-xs ${r?.success ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                {r?.success ? `✓ ${r.message}` : `✗ ${r?.error ?? "Failed to send"}`}
              </div>
            );
          }

          // Loading state for tools being called
          if (state === "call") {
            const toolLabels: Record<string, string> = {
              getBAADetails: "Looking up contract details...",
              getVendorDetails: "Looking up vendor info...",
              searchContracts: "Searching contracts...",
              sendReminder: "Sending reminder...",
              getRecentActivity: "Fetching recent activity...",
              getComplianceOverview: "Getting compliance overview...",
            };
            return (
              <div key={toolCallId} className="my-1 flex items-center gap-2 text-xs text-muted-foreground">
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {toolLabels[toolName] ?? `Running ${toolName}...`}
              </div>
            );
          }

          // Generic result — don't show raw data (the AI will interpret it in text)
          return null;
        })}
      </div>
    </div>
  );
}
