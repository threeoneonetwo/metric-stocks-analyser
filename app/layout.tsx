import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@/components/google-analytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://metricfinance.app"),
  title: "Indian Stock Analysis in Seconds | Metric Finance",
  description:
    "Understand the stocks you're actually investing in. Search any NSE or BSE stock, get the full picture in seconds. Free, no sign-up needed.",
  openGraph: {
    title: "Metric Finance : Finally know what you're investing in",
    description: "Understand the stocks you're actually investing in. Search any NSE or BSE stock, get the full picture in seconds. Free, no sign-up needed.",
    url: "https://metricfinance.app",
    siteName: "Metric Finance",
    images: [{ url: "https://metricfinance.app/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Metric Finance : Finally know what you're investing in",
    description: "Understand the stocks you're actually investing in. Search any NSE or BSE stock, get the full picture in seconds. Free, no sign-up needed.",
    images: ["https://metricfinance.app/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "any", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <GoogleAnalytics />
        <Analytics />
      </body>
    </html>
  );
}
