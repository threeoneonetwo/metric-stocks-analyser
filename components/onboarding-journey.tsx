"use client";

import { BarChart3, Check, ChevronRight, Search, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "metric:onboarding:v1";

const steps = [
  {
    eyebrow: "Mission 01",
    title: "Search like a person",
    body: "Type a ticker or company name. Metric resolves the closest NSE/BSE stock and shows matches before you run it.",
    icon: Search,
    xp: 25,
  },
  {
    eyebrow: "Mission 02",
    title: "Read the live signal",
    body: "The brief turns price action, volume, risk, peers, and news into plain-English context for the stock.",
    icon: BarChart3,
    xp: 50,
  },
  {
    eyebrow: "Mission 03",
    title: "Compare before acting",
    body: "Use movers, peer comparison, and news sentiment to understand whether the move has depth or is just noise.",
    icon: Sparkles,
    xp: 75,
  },
  {
    eyebrow: "Ready",
    title: "Run your first analysis",
    body: "Pick a stock, scan the brief, and refresh when you want the latest available snapshot.",
    icon: Check,
    xp: 100,
  },
];

export function OnboardingJourney() {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const closeOnboarding = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, "complete");
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const shouldPreviewOnboarding = new URLSearchParams(window.location.search).has("onboarding");

    if (shouldPreviewOnboarding) {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    setIsMounted(true);
    setIsOpen(window.localStorage.getItem(STORAGE_KEY) !== "complete");
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeOnboarding();
      }
    }

    window.addEventListener("keydown", closeWithEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [closeOnboarding, isOpen]);

  const progress = useMemo(() => ((activeStep + 1) / steps.length) * 100, [activeStep]);
  const step = steps[activeStep];
  const StepIcon = step.icon;
  const isFinalStep = activeStep === steps.length - 1;

  function continueJourney() {
    if (isFinalStep) {
      closeOnboarding();
      window.setTimeout(() => {
        document.getElementById("ticker-search")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
      return;
    }

    setActiveStep((current) => current + 1);
  }

  if (!isMounted || !isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="metric-onboarding-title"
    >
      <div className="onboarding-card w-full max-w-[390px] border-4 border-black bg-metric-finance-bg neo-shadow">
        <div className="flex items-center justify-between border-b-4 border-black bg-metric-cream px-4 py-3">
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-metric-blue">
              First run guide
            </p>
            <p className="text-[24px] font-black leading-none tracking-[-0.04em] text-black">
              metric
            </p>
          </div>
          <button
            type="button"
            aria-label="Close onboarding"
            className="neo-press flex h-8 w-8 items-center justify-center border-2 border-black bg-white hover:bg-metric-finance-accent-soft"
            onClick={closeOnboarding}
          >
            <X size={18} strokeWidth={2.8} />
          </button>
        </div>

        <div className="relative overflow-hidden p-4">
          <div className="onboarding-scan mb-4 border-2 border-dashed border-black bg-metric-finance-accent-soft p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-metric-muted">
                Analyst mode
              </span>
              <span className="border-2 border-black bg-black px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.1em] text-white">
                {step.xp} XP
              </span>
            </div>
            <div className="mt-3 h-3 border-2 border-black bg-white">
              <div className="h-full bg-metric-finance-accent transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="surface bg-white p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="onboarding-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-black bg-metric-finance-accent-soft">
                <StepIcon size={24} strokeWidth={2.6} />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.12em] text-metric-blue">
                  {step.eyebrow}
                </p>
                <h2 id="metric-onboarding-title" className="text-[27px] font-black leading-[0.96] tracking-[-0.04em] text-black">
                  {step.title}
                </h2>
              </div>
            </div>

            <p className="text-[16px] font-medium leading-6 text-black">
              {step.body}
            </p>

            <div className="mt-5 grid grid-cols-4 gap-2">
              {steps.map((item, index) => (
                <div
                  key={item.title}
                  className={`h-3 border-2 border-black transition-colors ${
                    index <= activeStep ? "bg-metric-finance-accent" : "bg-white"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
            <button
              type="button"
              className="neo-press border-4 border-black bg-black px-4 py-3 font-mono text-sm font-black uppercase tracking-[0.06em] text-white hover:bg-metric-finance-accent"
              onClick={continueJourney}
            >
              {isFinalStep ? "Start analysis" : "Continue"}
            </button>
            <button
              type="button"
              className="neo-press flex h-full items-center justify-center border-4 border-black bg-white px-3 text-black hover:bg-metric-finance-accent-soft"
              onClick={continueJourney}
              aria-label={isFinalStep ? "Open search" : "Next onboarding step"}
            >
              <ChevronRight size={22} strokeWidth={3} />
            </button>
          </div>

          <button
            type="button"
            className="mx-auto mt-4 block font-mono text-[10px] font-black uppercase tracking-[0.12em] text-metric-muted underline underline-offset-4"
            onClick={closeOnboarding}
          >
            Skip guide
          </button>
        </div>
      </div>
    </div>
  );
}
