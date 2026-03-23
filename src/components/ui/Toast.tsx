"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  addToast: (message: string, variant: ToastVariant) => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}

// ─── Variant styles ─────────────────────────────────────────────────────────

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success:
    "bg-emerald-50 border-emerald-400 text-emerald-800",
  error:
    "bg-red-50 border-red-400 text-red-800",
  warning:
    "bg-amber-50 border-amber-400 text-amber-800",
  info:
    "bg-blue-50 border-blue-400 text-blue-800",
};

const VARIANT_ICONS: Record<ToastVariant, string> = {
  success: "M9 12.75 11.25 15 15 9.75",
  error: "M6 18 18 6M6 6l12 12",
  warning: "M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z",
  info: "m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z",
};

// ─── Single Toast ───────────────────────────────────────────────────────────

function Toast({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(item.id), 300);
    }, 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.id, onDismiss]);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => onDismiss(item.id), 300);
  };

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg
        transition-all duration-300
        ${VARIANT_CLASSES[item.variant]}
        ${exiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}
      `}
    >
      <svg
        className="mt-0.5 h-5 w-5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={VARIANT_ICONS[item.variant]}
        />
      </svg>
      <p className="flex-1 text-sm font-medium">{item.message}</p>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Provider ───────────────────────────────────────────────────────────────

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    toastIdCounter += 1;
    const id = `toast-${toastIdCounter}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast container — fixed top-right */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-0 top-0 z-50 flex w-full max-w-sm flex-col gap-2 p-4"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast item={t} onDismiss={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
