"use client";

import { BarChart3, Check, ChevronRight, FileText, Newspaper, ShieldAlert, Sparkles, Table2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "metric:report-guide:v1";

const guideSteps = [
  {
    id: "brief",
    eyebrow: "Level 01",
    title: "Start with the brief",
    body: "Read the plain-English summary first. It tells you what the latest price, volume, peers, technicals, and news are saying together.",
    target: "metric-brief",
    reward: "Brief scanned",
    icon: FileText,
  },
  {
    id: "signal-grid",
    eyebrow: "Level 02",
    title: "Check the signal grid",
    body: "Use this as the fast dashboard. It shows whether the move is coming from price action, volume, range position, news, or technicals.",
    target: "signal-grid",
    reward: "Signals mapped",
    icon: BarChart3,
  },
  {
    id: "peer-lens",
    eyebrow: "Level 03",
    title: "Compare against peers",
    body: "This tells you whether the stock is moving alone or with its closest competitors. That difference matters before reading the move too strongly.",
    target: "peer-lens",
    reward: "Peer context",
    icon: Table2,
  },
  {
    id: "news",
    eyebrow: "Level 04",
    title: "Read the news signal",
    body: "Matched headlines give the business context behind the tape. Look for whether the news tone confirms or contradicts the market move.",
    target: "news-sentiment",
    reward: "News checked",
    icon: Newspaper,
  },
  {
    id: "risks",
    eyebrow: "Level 05",
    title: "Scan what could matter",
    body: "This is where the report surfaces valuation, earnings, and timing risks so you do not treat one green or red number as the whole story.",
    target: "risk-feed",
    reward: "Risk lens",
    icon: ShieldAlert,
  },
  {
    id: "meaning",
    eyebrow: "Final level",
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
  const [isComplete, setIsComplete] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [earnedRewards, setEarnedRewards] = useState<string[]>([]);

  useEffect(() => {
    const complete = window.localStorage.getItem(STORAGE_KEY) === "complete";
    setIsMounted(true);
    setIsComplete(complete);
    setIsOpen(!complete);
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
    setIsComplete(true);
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
    setIsComplete(true);
    setIsOpen(false);
  }

  if (!isMounted) {
    return null;
  }

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          className="report-guide-tab neo-press fixed right-0 top-[9.5rem] z-[70] border-4 border-r-0 border-black bg-metric-finance-accent px-2 py-3 font-mono text-[0.65rem] font-black uppercase tracking-[0.1em] text-black neo-shadow"
          onClick={() => {
            setIsOpen(true);
            window.setTimeout(() => scrollToTarget(active.target), 90);
          }}
          aria-label="Open report walkthrough"
        >
          {isComplete ? "Guide" : `Level ${activeStep + 1}`}
        </button>
      ) : null}

      {isOpen ? (
        <aside
          className="report-guide-popout fixed right-0 top-[6.25rem] z-[70] w-[min(260px,calc(100vw-112px))] border-4 border-r-0 border-black bg-white neo-shadow"
          aria-label="Report walkthrough"
        >
          <div className="border-b-4 border-black bg-metric-finance-accent-soft p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[0.52rem] font-black uppercase tracking-[0.1em] text-metric-blue">
                  Report walkthrough
                </p>
                <h2 className="mt-1 text-[1.15rem] font-black leading-none tracking-[-0.04em] text-black">
                  Learn the {ticker} brief
                </h2>
              </div>
              <button
                type="button"
                className="neo-press border-2 border-black bg-white px-2 py-1.5 font-mono text-[0.52rem] font-black uppercase tracking-[0.08em] text-black hover:bg-metric-finance-accent"
                onClick={skipGuide}
              >
                Skip
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="border-2 border-black bg-black px-2 py-1 font-mono text-[0.55rem] font-black uppercase tracking-[0.08em] text-white">
                Level {activeStep + 1}
              </span>
              <span className="font-mono text-[0.55rem] font-black uppercase tracking-[0.1em] text-metric-muted">
                {activeStep + 1} / {guideSteps.length}
              </span>
            </div>
            <div className="mt-2 h-2.5 border-2 border-black bg-white">
              <div className="h-full bg-metric-finance-accent transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto p-3">
            <div className="mb-3 grid grid-cols-6 gap-1">
              {guideSteps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = index === activeStep;
                const isDone = index < activeStep || earnedRewards.includes(step.reward);
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`neo-press flex h-8 flex-col items-center justify-center border-2 border-black ${
                      isActive ? "bg-metric-finance-accent" : isDone ? "bg-white" : "bg-metric-surface-variant"
                    }`}
                    aria-label={step.title}
                    onClick={() => {
                      setActiveStep(index);
                      scrollToTarget(step.target);
                    }}
                  >
                    {isDone ? <Check size={11} strokeWidth={3} /> : <StepIcon size={11} strokeWidth={2.5} />}
                    <span className="mt-0.5 font-mono text-[0.38rem] font-black uppercase leading-none">
                      L{index + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-2">
              <div className="onboarding-icon flex h-10 w-10 items-center justify-center rounded-full border-4 border-black bg-metric-finance-accent-soft">
                <ActiveIcon size={18} strokeWidth={2.6} />
              </div>
              <div>
                <p className="font-mono text-[0.55rem] font-black uppercase tracking-[0.12em] text-metric-blue">
                  {active.eyebrow}
                </p>
                <h3 className="text-[1.15rem] font-black leading-[0.95] tracking-[-0.04em] text-black">
                  {active.title}
                </h3>
              </div>
            </div>

            <p className="mt-3 text-[0.78rem] font-medium leading-5 text-black">
              {active.body}
            </p>

            <div className="mt-3 flex items-center justify-between gap-2 border-2 border-black bg-metric-finance-accent-soft px-2 py-1.5">
              <span className="font-mono text-[0.52rem] font-black uppercase tracking-[0.08em] text-metric-muted">
                Reward
              </span>
              <span className="font-mono text-[0.55rem] font-black uppercase tracking-[0.08em] text-black">
                {active.reward}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                className="neo-press border-4 border-black bg-black px-3 py-2.5 font-mono text-[0.72rem] font-black uppercase tracking-[0.06em] text-white hover:bg-metric-finance-accent hover:text-black"
                onClick={continueGuide}
              >
                {isFinalStep ? "Finish level" : "Next level"}
              </button>
              <button
                type="button"
                className="neo-press flex items-center justify-center border-4 border-black bg-white px-2.5 text-black hover:bg-metric-finance-accent-soft"
                onClick={() => scrollToTarget(active.target)}
                aria-label="Jump to current report section"
              >
                <ChevronRight size={18} strokeWidth={3} />
              </button>
            </div>

            {earnedRewards.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {earnedRewards.map((reward) => (
                  <span
                    key={reward}
                    className="onboarding-earned border-2 border-black bg-white px-2 py-1 font-mono text-[0.6rem] font-black uppercase tracking-[0.08em] text-black"
                  >
                    + {reward}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </aside>
      ) : null}
    </>
  );
}
