import Link from "next/link";
import { Menu, RefreshCw, Share2 } from "lucide-react";

type TopBarProps = {
  reportActions?: boolean;
  ticker?: string;
};

export function TopBar({ reportActions = false, ticker }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-black bg-metric-yellow/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-mono text-sm font-semibold uppercase tracking-[0]">
          Metric Finance
        </Link>
        {reportActions ? (
          <div className="flex items-center gap-2">
            <Link
              href={`/analyze/${ticker ?? ""}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-black bg-metric-yellow"
              aria-label="Refresh analysis"
            >
              <RefreshCw size={16} strokeWidth={1.8} />
            </Link>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-black bg-black text-metric-yellow"
              aria-label="Share report"
            >
              <Share2 size={16} strokeWidth={1.8} />
            </button>
          </div>
        ) : (
          <>
            <nav className="hidden items-center gap-6 font-mono text-xs uppercase md:flex">
              <a href="#how-it-works" className="metric-link">
                How it works
              </a>
            </nav>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded border border-black bg-metric-yellow md:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} strokeWidth={1.8} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export function FooterBar() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-black bg-black px-4 py-2 text-center font-mono text-[11px] uppercase leading-none text-metric-yellow">
      Built by{" "}
      <a
        href="https://www.notion.so/"
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        Vansh
      </a>{" "}
      · Not financial advice
    </footer>
  );
}
