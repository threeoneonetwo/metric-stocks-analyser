import { getDb } from "./client";
import { productEvents } from "./schema";

export type ProductEventInput = {
  eventName: string;
  ticker?: string;
  ipHash?: string;
  visitorCountry?: string;
  visitorRegion?: string;
  visitorCity?: string;
  visitorTimezone?: string;
  metadata?: Record<string, unknown>;
};

export async function logProductEvent(input: ProductEventInput) {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [event] = await db
    .insert(productEvents)
    .values({
      eventName: input.eventName,
      ticker: input.ticker,
      ipHash: input.ipHash,
      visitorCountry: input.visitorCountry,
      visitorRegion: input.visitorRegion,
      visitorCity: input.visitorCity,
      visitorTimezone: input.visitorTimezone,
      metadata: input.metadata,
    })
    .returning();

  return event ?? null;
}
