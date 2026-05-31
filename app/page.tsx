import { FooterBar, TopBar } from "@/components/site-chrome";
import { TickerSearch } from "@/components/ticker-search";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <TopBar />
      <section className="mx-auto flex w-full max-w-[42rem] flex-1 flex-col gap-10 px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1
            className="animate-entrance delay-1 text-[2.38rem] font-black leading-[0.98] text-black [text-shadow:0.45px_0_0_#000,-0.45px_0_0_#000] min-[390px]:text-[2.55rem] sm:text-[2.75rem]"
            style={{ fontWeight: 900 }}
          >
            <span className="block whitespace-nowrap">Analyse Indian stocks</span>
            <span className="block whitespace-nowrap">in seconds</span>
          </h1>
          <p className="animate-entrance delay-2 max-w-[32rem] text-base leading-6">
            Our advanced agentic engine monitors the Indian equity market to
            identify high-probability breakout patterns across thousands of
            stocks instantly today.
          </p>
        </div>

        <section id="ticker-search" className="scroll-mt-20">
          <div className="animate-entrance delay-3">
            <TickerSearch />
          </div>
        </section>
      </section>
      <FooterBar />
    </main>
  );
}
