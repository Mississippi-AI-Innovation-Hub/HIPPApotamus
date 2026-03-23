"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

// ─── Component ──────────────────────────────────────────────────────────────

export default function DevTools() {
  const { addToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Hide in production
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const env = process.env.NODE_ENV ?? "unknown";
  const tableName = process.env.NEXT_PUBLIC_DYNAMODB_TABLE ?? "hipaapotamus-dev";

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addToast("Demo data reset successfully", "success");
    } catch {
      addToast("Failed to reset demo data", "error");
    } finally {
      setResetting(false);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      addToast("Data exported to console", "info");
    } catch {
      addToast("Failed to export data", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleTriggerEmail = async () => {
    setSendingEmail(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      addToast("Test email triggered (SES sandbox)", "success");
    } catch {
      addToast("Failed to trigger test email", "error");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-30">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 rounded border border-orange-300 bg-orange-50 px-3 py-2.5 text-xs font-semibold text-orange-700 shadow-lg transition-colors hover:bg-orange-100"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.193-.14 1.743" />
        </svg>
        Dev Tools
        <svg
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-orange-200 bg-white p-4 shadow-xl">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-orange-600">
            Developer Tools
          </h3>

          {/* Environment info */}
          <div className="mb-4 space-y-1 rounded-lg bg-slate-50 p-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Environment</span>
              <span className="font-mono font-medium text-slate-700">{env}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">DynamoDB Table</span>
              <span className="max-w-[140px] truncate font-mono font-medium text-slate-700">
                {tableName}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleResetDemo}
              disabled={resetting}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {resetting ? (
                <Spinner />
              ) : (
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                </svg>
              )}
              Reset Demo Data
            </button>

            <button
              type="button"
              onClick={handleExportAll}
              disabled={exporting}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {exporting ? (
                <Spinner />
              ) : (
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )}
              Export All Data
            </button>

            <button
              type="button"
              onClick={handleTriggerEmail}
              disabled={sendingEmail}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {sendingEmail ? (
                <Spinner />
              ) : (
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              )}
              Trigger Test Email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Spinner ────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
