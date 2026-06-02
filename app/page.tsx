import { FooterBar, TopBar } from "@/components/site-chrome";
import { DailyMovers } from "@/components/daily-movers";
import { HomeFaq } from "@/components/home-faq";
import { OnboardingJourney } from "@/components/onboarding-journey";
import { TickerSearch } from "@/components/ticker-search";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <TopBar />
      <OnboardingJourney />
      <section className="mx-auto flex w-full max-w-[42rem] flex-1 flex-col gap-[32px] px-4 pb-10 pt-14 sm:px-6">
        <div className="flex flex-col items-center gap-[15px] text-center">
          <h1
            className="animate-entrance delay-1 font-serif italic leading-[0.9] text-black"
            style={{
              fontFamily: 'Georgia, "Times New Roman", Times, serif',
              fontWeight: 700,
            }}
          >
            <span className="block whitespace-nowrap text-[40px]">Analyse Indian</span>
            <span className="block whitespace-nowrap text-[40px]">stocks in seconds</span>
          </h1>
          <p className="animate-entrance delay-2 max-w-full text-[18px] leading-7">
            <span className="block whitespace-nowrap">
              Our agentic engine monitors the Indian equity
            </span>
            <span className="block whitespace-nowrap">
              market for daily price and volume moves.
            </span>
          </p>
        </div>

        <section id="ticker-search" className="mx-auto w-[92%] max-w-[38rem] scroll-mt-20">
          <div className="animate-entrance delay-3">
            <TickerSearch />
          </div>
        </section>
        <div className="mt-[23px]">
          <DailyMovers />
        </div>
        <HomeFaq />
      </section>
      <FooterBar />
    </main>
  );
}
