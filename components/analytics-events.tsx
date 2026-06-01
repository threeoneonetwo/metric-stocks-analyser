"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/gtag";

type AnalysisEventProps = {
  ticker: string;
  companyName: string;
  refresh?: boolean;
};

export function AnalysisRunEvent({ ticker, companyName, refresh = false }: AnalysisEventProps) {
  useEffect(() => {
    trackEvent("analysis_run", {
      event_category: "analysis",
      ticker,
      company_name: companyName,
      refresh,
    });
  }, [companyName, refresh, ticker]);

  return null;
}

export function ReportViewEvent({ ticker, companyName }: AnalysisEventProps) {
  useEffect(() => {
    trackEvent("report_view", {
      event_category: "analysis",
      ticker,
      company_name: companyName,
    });
  }, [companyName, ticker]);

  return null;
}
