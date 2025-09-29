import { getDb } from "@/db/database";
import { linkClicks } from "@/drizzle-out/schema";
import { type LinkClickMessageType } from "@/zod/queue";

export async function addLinkClick(info: LinkClickMessageType["data"]) {
  const db = getDb();
  await db.insert(linkClicks).values({
    id: info.id,
    accountId: info.accountId,
    destination: info.destination,
    country: info.country,
    clickedTime: info.timestamp,
    latitude: info.latitude,
    longitude: info.longitude,
  });
}