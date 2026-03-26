"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { UserRole } from "@/types";
import Sidebar from "@/components/dashboard/Sidebar";
import AgenticChatPanel from "@/components/chat/AgenticChatPanel";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardLayoutProps {
  children: ReactNode;
  userName: string;
  userRole: UserRole;
  userEmail: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
  userName,
  userRole,
  userEmail,
}: DashboardLayoutProps) {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotWidth, setCopilotWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ available: boolean; provider: string }>({ available: false, provider: "none" });

  useEffect(() => {
    fetch("/api/ai-status")
      .then(res => res.json())
      .then(data => setAiStatus(data))
      .catch(() => setAiStatus({ available: false, provider: "none" }));
  }, []);

  // Drag-to-resize handler
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      const startX = e.clientX;
      const startWidth = copilotWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = startX - moveEvent.clientX;
        const newWidth = Math.min(Math.max(startWidth + delta, 320), 700);
        setCopilotWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [copilotWidth],
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Left: Sidebar */}
      <Sidebar
        userName={userName}
        userRole={userRole}
        userEmail={userEmail}
      />

      {/* Center: Main content */}
      <main className="flex-1 overflow-y-auto dot-pattern">
        <div className="space-y-8 px-8 py-8">{children}</div>
      </main>

      {/* Copilot edge tab — a vertical pill docked to the right edge */}
      <div
        className={`fixed right-0 top-1/2 z-40 -translate-y-1/2 transition-all duration-300 ${
          copilotOpen
            ? "pointer-events-none translate-x-4 opacity-0"
            : "translate-x-0 opacity-100"
        }`}
      >
        <button
          onClick={() => setCopilotOpen(true)}
          className="group flex flex-col items-center gap-2 rounded-l-2xl border border-r-0 border-border bg-card px-2 py-5 shadow-premium transition-all duration-200 hover:px-3 hover:shadow-premium-hover"
          title="Open HIPAA Copilot"
        >
          {/* Sparkle icon */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
            style={{
              background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
            }}
          >
            <svg
              className="h-4 w-4 text-white"
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
          {/* Vertical text */}
          <span
            className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground transition-colors group-hover:text-[#0F766E]"
            style={{ writingMode: "vertical-lr" }}
          >
            AI Copilot
          </span>
          {/* Pulsing dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
        </button>
      </div>

      {/* Right: AI Compliance Agent Panel — collapsible + resizable */}
      <aside
        className={`relative flex shrink-0 flex-col border-l border-border bg-card ${
          copilotOpen ? "" : "w-0 overflow-hidden border-l-0"
        }`}
        style={
          copilotOpen
            ? {
                width: `${copilotWidth}px`,
                transition: isResizing ? "none" : "width 300ms ease-in-out",
              }
            : {
                width: 0,
                transition: "width 300ms ease-in-out",
              }
        }
      >
        {/* Drag handle — left edge of panel */}
        {copilotOpen && (
          <div
            onMouseDown={handleResizeStart}
            className="group absolute left-0 top-0 z-10 flex h-full w-1.5 cursor-col-resize items-center justify-center hover:w-2"
            title="Drag to resize"
          >
            <div className="h-8 w-1 rounded-full bg-border opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        )}

        {/* Collapse tab — docked to left edge, vertically centered */}
        {copilotOpen && (
          <button
            onClick={() => setCopilotOpen(false)}
            className="group absolute -left-[30px] top-1/2 z-20 -translate-y-1/2 flex flex-col items-center gap-2 rounded-l-2xl border border-r-0 border-border bg-card px-2 py-5 shadow-premium transition-all duration-200 hover:px-3 hover:shadow-premium-hover"
            title="Collapse HIPAA Copilot"
          >
            <svg
              className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-[#0F766E]"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
            <span
              className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground transition-colors group-hover:text-[#0F766E]"
              style={{ writingMode: "vertical-lr" }}
            >
              Close
            </span>
          </button>
        )}

        {/* Hero header */}
        <div
          className="relative overflow-hidden border-b border-border px-6 py-5"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #134E48 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background:
                    "linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)",
                }}
              >
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3
                  className="text-base font-bold text-white"
                  style={{ fontFamily: "'Satoshi', sans-serif" }}
                >
                  HIPAA Copilot
                </h3>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {aiStatus.available ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      </span>
                      <p className="text-xs font-medium text-emerald-300">
                        Online — {aiStatus.provider === "gemini" ? "Gemini" : "OpenAI"}
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <p className="text-xs font-medium text-amber-300">No API key configured</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Your AI-powered compliance assistant. Ask questions, run actions,
              or get insights — all from here.
            </p>
          </div>
        </div>

        {/* Agentic chat panel — replaces static capability cards + chat input */}
        <AgenticChatPanel />
      </aside>
    </div>
  );
}
