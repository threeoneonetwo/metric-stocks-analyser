import Link from "next/link";
import { Menu, RefreshCw, Share2 } from "lucide-react";

type TopBarProps = {
  reportActions?: boolean;
  ticker?: string;
};

export function TopBar({ reportActions = false, ticker }: TopBarProps) {
  return (
    <header className="sticky top-0 z-50 border-b-4 border-black bg-metric-cream px-4 py-2 neo-shadow">
      <div className="mx-auto flex h-12 max-w-[42rem] items-center justify-between">
        <Link
          href="/"
          className="text-4xl font-bold leading-none text-black"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
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
          <button
            className="neo-press inline-flex h-9 w-9 items-center justify-center border-2 border-black bg-white"
            aria-label="Open menu"
          >
            <Menu size={20} strokeWidth={2.2} />
          </button>
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
