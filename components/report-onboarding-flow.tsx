"use client";

import { BarChart3, Check, ChevronRight, FileText, Newspaper, ShieldAlert, Sparkles, Table2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "metric:report-guide:v1";

const guideSteps = [
  {
    id: "brief",
    eyebrow: "Step 01",
    title: "Start with the brief",
    body: "Read the plain-English summary first. It tells you what the latest price, volume, peers, technicals, and news are saying together.",
    target: "metric-brief",
    reward: "Brief scanned",
    icon: FileText,
  },
  {
    id: "signal-grid",
    eyebrow: "Step 02",
    title: "Check the signal grid",
    body: "Use this as the fast dashboard. It shows whether the move is coming from price action, volume, range position, news, or technicals.",
    target: "signal-grid",
    reward: "Signals mapped",
    icon: BarChart3,
  },
  {
    id: "peer-lens",
    eyebrow: "Step 03",
    title: "Compare against peers",
    body: "This tells you whether the stock is moving alone or with its closest competitors. That difference matters before reading the move too strongly.",
    target: "peer-lens",
    reward: "Peer context",
    icon: Table2,
  },
  {
    id: "news",
    eyebrow: "Step 04",
    title: "Read the news signal",
    body: "Matched headlines give the business context behind the tape. Look for whether the news tone confirms or contradicts the market move.",
    target: "news-sentiment",
    reward: "News checked",
    icon: Newspaper,
  },
  {
    id: "risks",
    eyebrow: "Step 05",
    title: "Scan what could matter",
    body: "This is where the report surfaces valuation, earnings, and timing risks so you do not treat one green or red number as the whole story.",
    target: "risk-feed",
    reward: "Risk lens",
    icon: ShieldAlert,
  },
  {
    id: "meaning",
    eyebrow: "Final",
    title: "Finish with the read",
    body: "The final section blends the evidence into one clean interpretation. Use it as the takeaway, then share the report if it is useful.",
    target: "what-this-means",
    reward: "Report unlocked",
    icon: Sparkles,
  },
];

type ReportOnboardingFlowProps = {
  ticker: string;
};

export function ReportOnboardingFlow({ ticker }: ReportOnboardingFlowProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [earnedRewards, setEarnedRewards] = useState<string[]>([]);

  useEffect(() => {
    setIsMounted(true);
    setIsOpen(window.localStorage.getItem(STORAGE_KEY) !== "complete");
  }, []);

  const active = guideSteps[activeStep];
  const ActiveIcon = active.icon;
  const progress = useMemo(() => ((activeStep + 1) / guideSteps.length) * 100, [activeStep]);
  const isFinalStep = activeStep === guideSteps.length - 1;

  useEffect(() => {
    if (!isMounted || !isOpen) {
      return;
    }

    document.querySelectorAll("[data-report-guide-target]").forEach((node) => {
      node.removeAttribute("data-report-guide-active");
    });

    const target = document.querySelector(`[data-report-guide-target="${active.target}"]`);
    target?.setAttribute("data-report-guide-active", "true");

    return () => {
      target?.removeAttribute("data-report-guide-active");
    };
  }, [active.target, isMounted, isOpen]);

  const scrollToTarget = useCallback((targetId: string) => {
    const target = document.querySelector(`[data-report-guide-target="${targetId}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const finishGuide = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, "complete");
    setEarnedRewards((current) => [...new Set([...current, active.reward])]);
    setIsOpen(false);
  }, [active.reward]);

  function continueGuide() {
    setEarnedRewards((current) => [...new Set([...current, active.reward])]);

    if (isFinalStep) {
      finishGuide();
      return;
    }

    const nextStep = activeStep + 1;
    setActiveStep(nextStep);
    window.setTimeout(() => scrollToTarget(guideSteps[nextStep].target), 90);
  }

  function skipGuide() {
    window.localStorage.setItem(STORAGE_KEY, "complete");
    setIsOpen(false);
  }

  if (!isMounted || !isOpen) {
    return null;
  }

  return (
    <section className="report-guide surface overflow-hidden p-0" aria-label="Report walkthrough">
      <div className="border-b-4 border-black bg-metric-finance-accent-soft p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[0.65rem] font-black uppercase tracking-[0.12em] text-metric-blue">
              Report walkthrough
            </p>
            <h2 className="mt-1 text-2xl font-black leading-none tracking-[-0.04em] text-black">
              Learn the {ticker} brief
            </h2>
          </div>
          <button
            type="button"
            className="neo-press border-2 border-black bg-white px-3 py-2 font-mono text-[0.65rem] font-black uppercase tracking-[0.08em] text-black hover:bg-metric-finance-accent"
            onClick={skipGuide}
          >
            Skip
          </button>
        </div>
        <div className="mt-4 h-3 border-2 border-black bg-white">
          <div className="h-full bg-metric-finance-accent transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 grid grid-cols-6 gap-1.5">
          {guideSteps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === activeStep;
            const isDone = index < activeStep || earnedRewards.includes(step.reward);
            return (
              <button
                key={step.id}
                type="button"
                className={`neo-press flex h-10 items-center justify-center border-2 border-black ${
                  isActive ? "bg-metric-finance-accent" : isDone ? "bg-white" : "bg-metric-surface-variant"
                }`}
                aria-label={step.title}
                onClick={() => {
                  setActiveStep(index);
                  scrollToTarget(step.target);
                }}
              >
                {isDone ? <Check size={15} strokeWidth={3} /> : <StepIcon size={15} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-3">
          <div className="onboarding-icon flex h-12 w-12 items-center justify-center rounded-full border-4 border-black bg-metric-finance-accent-soft">
            <ActiveIcon size={23} strokeWidth={2.6} />
          </div>
          <div>
            <p className="font-mono text-[0.65rem] font-black uppercase tracking-[0.12em] text-metric-blue">
              {active.eyebrow}
            </p>
            <h3 className="text-[1.65rem] font-black leading-[0.95] tracking-[-0.04em] text-black">
              {active.title}
            </h3>
          </div>
        </div>

        <p className="mt-4 text-[0.95rem] font-medium leading-6 text-black">
          {active.body}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 border-2 border-black bg-white px-3 py-2">
          <span className="font-mono text-[0.65rem] font-black uppercase tracking-[0.08em] text-metric-muted">
            Reward
          </span>
          <span className="font-mono text-[0.7rem] font-black uppercase tracking-[0.08em] text-black">
            {active.reward}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
          <button
            type="button"
            className="neo-press border-4 border-black bg-black px-4 py-3 font-mono text-sm font-black uppercase tracking-[0.06em] text-white hover:bg-metric-finance-accent hover:text-black"
            onClick={continueGuide}
          >
            {isFinalStep ? "Finish guide" : "Next section"}
          </button>
          <button
            type="button"
            className="neo-press flex items-center justify-center border-4 border-black bg-white px-3 text-black hover:bg-metric-finance-accent-soft"
            onClick={() => scrollToTarget(active.target)}
            aria-label="Jump to current report section"
          >
            <ChevronRight size={22} strokeWidth={3} />
          </button>
        </div>

        {earnedRewards.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {earnedRewards.map((reward) => (
              <span
                key={reward}
                className="onboarding-earned border-2 border-black bg-metric-finance-accent-soft px-2 py-1 font-mono text-[0.6rem] font-black uppercase tracking-[0.08em] text-black"
              >
                + {reward}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
