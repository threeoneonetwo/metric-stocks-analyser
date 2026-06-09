"use client";

import { BarChart3, Check, Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "metric:onboarding:v1";
const COOKIE_KEY = "metric_onboarding";

const steps = [
  {
    icon: Search,
    label: "01",
    title: "Search any stock",
    body: "Type a ticker or company name. Metric resolves the closest NSE or BSE stock and shows matches as you type.",
  },
  {
    icon: BarChart3,
    label: "02",
    title: "Read the live signal",
    body: "The brief turns price action, volume, peers, and news into plain English context you can actually use.",
  },
  {
    icon: Sparkles,
    label: "03",
    title: "Compare before acting",
    body: "Use movers, peer comparison, and news sentiment to understand whether a move has depth or is just noise.",
  },
  {
    icon: Check,
    label: "04",
    title: "Run your first analysis",
    body: "Pick any stock, scan the brief, and refresh when you want the latest available snapshot.",
  },
];

export function OnboardingJourney() {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const completeOnboarding = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, "complete");
    document.cookie = `${COOKIE_KEY}=complete; path=/; max-age=31536000; SameSite=Lax`;
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const shouldPreviewOnboarding = new URLSearchParams(window.location.search).has("onboarding");
    if (shouldPreviewOnboarding) {
      window.localStorage.removeItem(STORAGE_KEY);
      document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
    }
    setIsMounted(true);
    if (window.localStorage.getItem(STORAGE_KEY) === "complete") return;

    const onFirstScroll = () => {
      setIsOpen(true);
      window.removeEventListener("scroll", onFirstScroll);
    };
    window.addEventListener("scroll", onFirstScroll, { passive: true });
    return () => window.removeEventListener("scroll", onFirstScroll);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalOverflow; };
  }, [isOpen]);

  const isFinalStep = activeStep === steps.length - 1;
  const step = steps[activeStep];
  const StepIcon = step.icon;

  function continueJourney() {
    if (isFinalStep) {
      completeOnboarding();
      window.setTimeout(() => {
        const nextPath = new URLSearchParams(window.location.search).get("next");
        if (nextPath?.startsWith("/")) { window.location.assign(nextPath); return; }
        document.getElementById("ticker-search")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
      return;
    }
    setActiveStep((c) => c + 1);
  }

  if (!isMounted || !isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-5"
      style={{ zIndex: 10000, background: "rgba(7,12,26,0.85)", backdropFilter: "blur(8px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="metric-onboarding-title"
    >
      <div
        className="w-full max-w-[340px] rounded-2xl flex flex-col overflow-hidden"
        style={{ background: "#080f20", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "Arial, sans-serif" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span className="text-white font-bold text-lg tracking-tight">Metric</span>
          <span
            className="text-[10px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: "rgba(184,196,255,0.1)", color: "#b8c4ff" }}
          >
            Quick start
          </span>
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-4">
          {/* Step icon + text */}
          <div className="flex items-start gap-3">
            <div
              className="shrink-0 flex items-center justify-center rounded-xl"
              style={{ width: 40, height: 40, background: "rgba(184,196,255,0.1)", border: "1px solid rgba(184,196,255,0.2)" }}
            >
              <StepIcon size={18} strokeWidth={2} color="#b8c4ff" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest mb-0.5" style={{ color: "#b8c4ff" }}>
                Step {step.label}
              </p>
              <h2 id="metric-onboarding-title" className="text-white font-bold text-base leading-tight">
                {step.title}
              </h2>
            </div>
          </div>

          <p className="text-sm leading-relaxed" style={{ color: "#8e909f" }}>
            {step.body}
          </p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-200"
                style={{
                  height: 4,
                  width: i === activeStep ? 20 : 6,
                  background: i <= activeStep ? "#b8c4ff" : "rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={continueJourney}
            className="w-full rounded-xl py-2.5 font-bold text-sm text-[#0b1326] active:scale-95 transition-all"
            style={{ background: "#b8c4ff" }}
          >
            {isFinalStep ? "Get started" : "Next"}
          </button>

          {/* Skip */}
          {!isFinalStep && (
            <button
              type="button"
              onClick={completeOnboarding}
              className="text-center text-xs transition-colors"
              style={{ color: "#8e909f" }}
            >
              Skip intro
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
