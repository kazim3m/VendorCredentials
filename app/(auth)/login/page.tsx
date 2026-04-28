"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!response.ok) {
      const payload = await response.json();
      setMessage(payload.error ?? "Could not send OTP.");
      return;
    }
    setMessage("If your account exists and is enabled, an OTP was sent.");
    setStep("otp");
  };

  const submitOtp = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: code }),
    });
    setLoading(false);
    if (!response.ok) {
      const payload = await response.json();
      setMessage(payload.error ?? "OTP verification failed.");
      return;
    }
    router.push("/app");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">Email OTP authentication (6 digits, valid for 10 minutes).</p>

      {step === "email" ? (
        <form className="mt-6 space-y-4" onSubmit={submitEmail}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-blue-500 focus:ring-2"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <button
            className="w-full rounded-md bg-slate-900 px-3 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={submitOtp}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="otp">
              6-digit OTP
            </label>
            <input
              id="otp"
              className="w-full rounded-md border border-slate-300 px-3 py-2 tracking-[0.35em] outline-none ring-blue-500 focus:ring-2"
              inputMode="numeric"
              maxLength={6}
              minLength={6}
              pattern="[0-9]{6}"
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            />
          </div>
          <button
            className="w-full rounded-md bg-slate-900 px-3 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
      )}

      {message ? <p className="mt-4 text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
