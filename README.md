# Metric Stocks Analyser

Metric Finance generates AI-powered equity research reports for NSE and BSE listed stocks. Enter any ticker and get a shareable analysis covering executive summary, contrarian signal, financials, peer comparison, sentiment, and risks.

Built on Next.js 15, Gemini 2.5, and Postgres, with streaming generation and sub-second cached reads.

## Tech Stack

- Next.js 15
- React 19
- Gemini 2.5 via AI SDK
- Postgres with Drizzle ORM
- Tailwind CSS 4

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run db:generate
npm run db:migrate
```
