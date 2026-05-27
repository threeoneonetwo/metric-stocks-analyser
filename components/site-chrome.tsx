"use client";

import Link from "next/link";
import { Menu, RefreshCw, Share2, X } from "lucide-react";
import { useState } from "react";

type TopBarProps = {
  reportActions?: boolean;
  ticker?: string;
};

const menuLinks = [
  ["About", "https://metricfinance.notion.site/Metric-Finance-36dbc65fd7b380799a64ec4979735b20?source=copy_link"],
];

export function TopBar({ reportActions = false, ticker }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b-4 border-black bg-metric-cream px-4 py-2 neo-shadow">
      <div className="mx-auto flex h-12 max-w-[42rem] items-center justify-between">
        <Link
          href="/"
          className="text-4xl font-extrabold leading-none tracking-[-0.04em] text-black"
          style={{ fontWeight: 800 }}
        >
          metric
        </Link>
        {reportActions ? (
          <div className="flex items-center gap-3">
            <Link
              href={`/analyze/${ticker ?? ""}`}
              className="neo-press inline-flex h-9 w-9 items-center justify-center border-2 border-black bg-white"
              aria-label="Refresh analysis"
            >
              <RefreshCw size={18} strokeWidth={2.2} />
            </Link>
            <button
              className="neo-press inline-flex h-9 w-9 items-center justify-center border-2 border-black bg-metric-green-bright"
              aria-label="Share report"
            >
              <Share2 size={18} strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              className="neo-press inline-flex h-9 w-9 items-center justify-center border-2 border-black bg-white"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((current) => !current)}
              type="button"
            >
              {menuOpen ? (
                <X size={20} strokeWidth={2.2} />
              ) : (
                <Menu size={20} strokeWidth={2.2} />
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
    </header>
  );
}

export function FooterBar() {
  return (
    <footer className="border-t-4 border-black bg-black px-4 py-6 text-center font-mono text-[11px] uppercase leading-none tracking-[0.1em] text-metric-surface-dim">
      Built by{" "}
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
