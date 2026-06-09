"use client";

import { useState } from "react";

export function DashboardLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/dashboard/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!response.ok) {
      setError("Wrong password.");
      return;
    }

    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-[#0b1326] px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
        <div className="rounded-2xl border border-[#b8c4ff]/25 bg-[#111a33] p-6 shadow-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[#b8c4ff]">Metric internal</p>
          <h1 className="mb-3 text-3xl font-black tracking-tight">Business dashboard</h1>
          <p className="mb-6 text-sm leading-6 text-[#c4c5d5]">
            Protected view for product usage, generation reliability, and the signals that should guide the next changes.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border border-[#b8c4ff]/30 bg-[#0b1326] px-4 py-3 text-sm font-bold outline-none placeholder:text-[#8e909f] focus:border-[#b8c4ff]"
            />
            {error ? <p className="text-xs font-bold text-[#f43f5e]">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#b8c4ff] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#0b1326] transition hover:bg-[#dde1ff] disabled:opacity-60"
            >
              {loading ? "Checking" : "Open dashboard"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
