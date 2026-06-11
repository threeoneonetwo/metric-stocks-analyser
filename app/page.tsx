import Link from "next/link";
import { LandingViewEvent } from "@/components/analytics-events";
import { DarkHomeFaq } from "@/components/home-faq";
import { HeroHeadline } from "@/components/hero-headline";
import { OnboardingJourney } from "@/components/onboarding-journey";
import { TickerSearch } from "@/components/ticker-search";
import { TestimonialsCarousel } from "@/components/testimonials-carousel";

export default function Home() {
  return (
    <main className="homepage relative min-h-screen flex flex-col">
      <LandingViewEvent />
      <OnboardingJourney />

      {/* Background */}
      <div className="fixed inset-0 -z-10 dot-grid" style={{ backgroundColor: "#0b1326" }} />
      <div className="linear-glow" />

      {/* Nav */}
      <nav
        className="fixed top-0 w-full z-50 flex items-center justify-between h-16 px-4 sm:px-10"
        style={{ background: "rgba(11,19,38,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <Link href="/" className="text-2xl font-bold text-white tracking-tight shrink-0" style={{ fontFamily: "Arial, sans-serif" }}>Metric</Link>
        <div className="flex items-center gap-4 sm:gap-6" style={{ fontFamily: "Arial, sans-serif" }}>
          <a
            href="#faq"
            className="text-sm text-[#8e909f] hover:text-white transition-colors py-2 px-1"
          >
            FAQ
          </a>
          <a
            href="https://metricfinance.notion.site/Privacy-Policy-377bc65fd7b380a7bb9af9f5df0b0911"
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[#8e909f] hover:text-white transition-colors py-2 px-1"
          >
            Privacy
          </a>
        </div>
      </nav>

      {/* Content */}
      <div className="relative mx-auto w-full max-w-xl px-5 flex flex-col items-center" style={{ paddingTop: "7rem", paddingBottom: "6rem", gap: "4rem" }}>

        {/* ── Hero ── */}
        <section className="w-full text-center" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* Badge */}
          <div className="flex justify-center animate-entrance delay-1">
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium tracking-widest uppercase text-[#b8c4ff]"
              style={{ background: "rgba(184,196,255,0.08)", border: "1px solid rgba(184,196,255,0.2)", fontFamily: "Arial, sans-serif" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse inline-block" />
              NSE · BSE · 2,133 stocks
            </span>
          </div>

          {/* Headline */}
          <div className="animate-entrance delay-2 w-full">
            <HeroHeadline />
          </div>

          {/* Search */}
          <div id="ticker-search" className="w-full scroll-mt-20 animate-entrance delay-3" style={{ position: "relative", zIndex: 9999, isolation: "isolate" }}>
            <TickerSearch dark />
          </div>

          {/* Stats */}
          <div className="animate-entrance delay-4 grid grid-cols-3 gap-3 w-full" style={{ position: "relative", zIndex: 1 }}>
            {[
              { value: "2,133 Stocks", label: "ANALYSED" },
              { value: "Upstox", label: "LIVE DATA" },
              { value: "Advanced AI", label: "ANALYST" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="dark-tile py-4 px-2 text-center cursor-default"
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                <p className="text-[#dbe2fd] font-bold text-sm">{value}</p>
                <p className="text-[#8e909f] text-[10px] mt-1 font-medium uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </section>


        {/* ── Testimonials ── */}
        <section className="animate-entrance delay-4 w-full">
          <TestimonialsCarousel />
        </section>

        {/* ── FAQ ── */}
        <div id="faq" className="w-full scroll-mt-20">
          <DarkHomeFaq />
        </div>

        {/* ── CTA ── */}
        <section className="w-full text-center" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            className="dark-tile p-8"
            style={{ fontFamily: "Arial, sans-serif" }}
          >
            <h2 className="text-white font-bold text-xl mb-2 tracking-tight">Try it now</h2>
            <p className="text-[#8e909f] text-sm mb-6 font-normal">Search any NSE or BSE listed stock above and get your brief in seconds.</p>
            <a
              href="#ticker-search"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm text-[#0b1326] bg-[#b8c4ff] hover:bg-[#dde1ff] active:scale-95 transition-all"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              Start Analysis
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer
        className="w-full py-5 px-6 text-center mt-auto"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(11,19,38,0.85)", backdropFilter: "blur(16px)", fontFamily: "Arial, sans-serif" }}
      >
        <p className="text-[11px] text-[#8e909f] font-medium tracking-wide">
          Built by{" "}
          <a href="https://www.linkedin.com/in/yashnapandugala/" target="_blank" rel="noreferrer" className="text-[#b8c4ff] hover:text-white transition-colors underline underline-offset-4">Yashna</a>
          {" "}&{" "}
          <a href="https://www.linkedin.com/in/vanshpandita-real/" target="_blank" rel="noreferrer" className="text-[#b8c4ff] hover:text-white transition-colors underline underline-offset-4">Vansh</a>
          {" "}· Not financial advice
        </p>
      </footer>
    </main>
  );
}
