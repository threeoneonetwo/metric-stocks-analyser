import { createHash } from "crypto";

type HeadersLike = {
  get(name: string): string | null;
};

export type VisitorMetadata = {
  ipHash?: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
};

export function getVisitorMetadata(headers: HeadersLike): VisitorMetadata {
  const ip = getClientIp(headers);
  const salt = process.env.VISITOR_HASH_SALT ?? process.env.DATABASE_URL ?? "metric-local";

  return {
    ipHash: ip ? createHash("sha256").update(`${salt}:${ip}`).digest("hex") : undefined,
    country: firstHeader(headers, ["x-vercel-ip-country", "cf-ipcountry"]),
    region: firstHeader(headers, ["x-vercel-ip-country-region", "x-vercel-ip-region"]),
    city: firstHeader(headers, ["x-vercel-ip-city"]),
    timezone: firstHeader(headers, ["x-vercel-ip-timezone"]),
  };
}

function getClientIp(headers: HeadersLike) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim();
  return firstHeader(headers, ["x-real-ip", "cf-connecting-ip", "x-vercel-forwarded-for"]);
}

function firstHeader(headers: HeadersLike, keys: string[]) {
  for (const key of keys) {
    const value = headers.get(key);
    if (value) return decodeURIComponent(value);
  }
  return undefined;
}
