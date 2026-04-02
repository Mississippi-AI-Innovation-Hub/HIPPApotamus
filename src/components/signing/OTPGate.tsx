"use client";

import { useState, useRef, useEffect } from "react";

interface OTPGateProps {
  baaId: string;
  token: string;
  vendorName: string;
  maskedEmail?: string;
  onVerified: () => void;
}

export default function OTPGate({
  baaId,
  token,
  vendorName,
  maskedEmail: initialMaskedEmail,
  onVerified,
}: OTPGateProps) {
  const [step, setStep] = useState<"send" | "verify">("send");
  const [maskedEmail, setMaskedEmail] = useState(initialMaskedEmail ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendOTP = async () => {
    setIsSending(true);
    setError("");

    try {
      const res = await fetch(`/api/baas/${baaId}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = (await res.json()) as { success?: boolean; email?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Failed to send verification code");
        return;
      }

      setMaskedEmail(data.email ?? maskedEmail);
      setStep("verify");
      setCooldown(60);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOTP = async (codeToVerify?: string) => {
    const finalCode = (codeToVerify ?? code).replace(/\D/g, "");
    if (finalCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const res = await fetch(`/api/baas/${baaId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code: finalCode }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string; attemptsRemaining?: number };

      if (!res.ok) {
        setError(data.error ?? "Verification failed");
        setCode("");
        inputRef.current?.focus();
        return;
      }

      onVerified();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow digits, max 6
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    setError("");

    // Auto-submit when 6 digits entered
    if (digits.length === 6) {
      handleVerifyOTP(digits);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal-100">
            <svg className="h-7 w-7 text-teal-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Identity Verification</h1>
          <p className="mt-1 text-sm text-slate-500">{vendorName}</p>
        </div>

        {step === "send" ? (
          /* ── Step 1: Send OTP ─────────────────────────────── */
          <div>
            <p className="mb-4 text-center text-sm text-slate-600">
              To access this agreement, we need to verify your identity. A 6-digit verification code will be sent to the email on file for your organization.
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleSendOTP}
              disabled={isSending}
              className="w-full rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </span>
              ) : "Send Verification Code"}
            </button>

            <p className="mt-4 text-center text-xs text-slate-400">
              The code will be sent to the Authorized Representative&apos;s registered email address.
            </p>
          </div>
        ) : (
          /* ── Step 2: Enter OTP ────────────────────────────── */
          <div>
            <p className="mb-1 text-center text-sm text-slate-600">
              We sent a verification code to
            </p>
            <p className="mb-5 text-center text-sm font-semibold text-slate-900">
              {maskedEmail}
            </p>

            {/* Single input for 6-digit code */}
            <div className="mb-4">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerifyOTP();
                }}
                placeholder="000000"
                className={`w-full rounded-lg border py-3 text-center text-2xl font-bold tracking-[0.5em] transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                  error ? "border-red-300 bg-red-50" : "border-slate-300 bg-white"
                }`}
                autoComplete="one-time-code"
              />
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={() => handleVerifyOTP()}
              disabled={isVerifying || code.length !== 6}
              className="w-full rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying...
                </span>
              ) : "Verify & Continue"}
            </button>

            {/* Resend */}
            <div className="mt-4 text-center">
              {cooldown > 0 ? (
                <p className="text-xs text-slate-400">Resend code in {cooldown}s</p>
              ) : (
                <button
                  onClick={handleSendOTP}
                  disabled={isSending}
                  className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline"
                >
                  Resend verification code
                </button>
              )}
            </div>

            <p className="mt-4 text-center text-[11px] text-slate-400">
              Code expires in 10 minutes. Maximum 3 attempts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
