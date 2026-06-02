"use client";

import Link from "next/link";
import { Menu, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ShareReportButton } from "@/components/share-report-button";

type TopBarProps = {
  reportActions?: boolean;
  ticker?: string;
  companyName?: string;
};

const menuLinks = [
  ["About", "https://metricfinance.notion.site/Metric-Finance-36dbc65fd7b380799a64ec4979735b20?source=copy_link"],
];

export function TopBar({ reportActions = false, ticker, companyName }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b-4 border-black bg-metric-cream neo-shadow">
      <div className="mx-auto flex h-10 max-w-[42rem] items-center justify-between px-4 py-1.5">
        <Link
          href="/"
          className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-black"
          style={{ fontWeight: 800 }}
        >
          metric
        </Link>
        {reportActions ? (
          <div className="flex items-center gap-3">
            <Link
              href={`/analyze/${ticker ?? ""}`}
              className="neo-press inline-flex h-8 w-8 items-center justify-center border-2 border-black bg-white"
              aria-label="Refresh analysis"
            >
              <RefreshCw size={17} strokeWidth={2.2} />
            </Link>
            <ShareReportButton
              ticker={ticker ?? ""}
              companyName={companyName}
              iconOnly
              iconSize={17}
              className="neo-press inline-flex h-8 w-8 items-center justify-center border-2 border-black bg-metric-green-bright"
            />
          </div>
        ) : (
          <div className="relative">
            <button
              className="neo-press inline-flex h-8 w-8 items-center justify-center border-2 border-black bg-white"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((current) => !current)}
              type="button"
            >
              {menuOpen ? (
                <X size={18} strokeWidth={2.2} />
              ) : (
                <Menu size={18} strokeWidth={2.2} />
              )}
            </button>
            {menuOpen ? (
              <nav
                aria-label="Main menu"
                className="absolute right-0 top-12 w-44 border-4 border-black bg-white p-2 neo-shadow"
              >
                {menuLinks.map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="block border-2 border-black px-4 py-3 text-sm font-extrabold uppercase tracking-[0.05em] text-black hover:bg-metric-green-bright"
                    onClick={() => setMenuOpen(false)}
                  >
                    {label}
                  </a>
                ))}
              </nav>
            ) : null}
          </div>
        )}
      </div>
      {reportActions ? <HeaderScrollProgress /> : null}
    </header>
  );
}

function HeaderScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let animationFrame = 0;

    function updateProgress() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const nextProgress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, nextProgress)));
    }

    function scheduleUpdate() {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updateProgress);
    }

    updateProgress();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return (
    <div className="h-[3px] w-full overflow-hidden bg-transparent" aria-hidden="true">
      <div
        className="scroll-progress-fill h-full bg-metric-finance-accent transition-[width] duration-100 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function FooterBar() {
  return (
    <footer className="border-t-4 border-black bg-black px-4 py-3 text-center font-mono text-[9px] uppercase leading-none tracking-[0.1em] text-metric-surface-dim">
      Built by{" "}
      <a
        href="https://www.linkedin.com/in/yashnapandugala/"
        target="_blank"
        rel="noreferrer"
        className="text-white underline underline-offset-2"
      >
        Yashna
      </a>{" "}
      &{" "}
      <a
        href="https://www.linkedin.com/in/vansh-sharma-/"
        target="_blank"
        rel="noreferrer"
        className="text-white underline underline-offset-2"
      >
        Vansh
      </a>{" "}
      • Not financial advice
    </footer>
  );
}
