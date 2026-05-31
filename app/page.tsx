import { FooterBar, TopBar } from "@/components/site-chrome";
import { TickerSearch } from "@/components/ticker-search";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <TopBar />
      <section className="mx-auto flex w-full max-w-[42rem] flex-1 -translate-y-12 flex-col justify-center gap-[32px] px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-[10px] text-center">
          <h1
            className="animate-entrance delay-1 font-black leading-[1.02] text-black [text-shadow:0.45px_0_0_#000,-0.45px_0_0_#000]"
            style={{ fontWeight: 900 }}
          >
            <span className="block whitespace-nowrap text-[40px]">Analyse Indian</span>
            <span className="block whitespace-nowrap text-[40px]">stocks in seconds</span>
          </h1>
          <p className="animate-entrance delay-2 max-w-full text-[clamp(13px,3.55vw,18px)] leading-7">
            <span className="block whitespace-nowrap">
              Our agentic engine monitors the Indian equity
            </span>
            <span className="block whitespace-nowrap">
              market to identify high-probability breakout patterns.
            </span>
          </p>
        </div>

        <section id="ticker-search" className="mx-auto w-full scroll-mt-20">
          <div className="animate-entrance delay-3">
            <TickerSearch />
          </div>
        </section>
      </section>
      <FooterBar />
    </main>
  );
}
