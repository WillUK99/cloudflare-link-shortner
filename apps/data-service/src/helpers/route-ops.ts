import { getLink } from "@repo/data-ops/queries/links";
import { type LinkSchemaType, linkSchema } from "@repo/data-ops/zod-schema/links";
import { LinkClickMessageType } from "@repo/data-ops/zod-schema/queue";
import moment from "moment";

async function getLinkInfoFromKV(env: Env, linkId: string): Promise<LinkSchemaType | null> {
  const linkInfo = await env.KV.get(linkId);
  if (!linkInfo) {
    return null;
  }

  try {
    const parsedLinkInfo = JSON.parse(linkInfo);
    return linkSchema.parse(parsedLinkInfo);
  } catch (error) {
    console.error(error);
    return null;
  }
}

const TTL_1_DAY = 60 * 60 * 24;

async function saveLinkInfoToKV(env: Env, linkId: string, linkInfo: LinkSchemaType): Promise<void> {
  try {
    await env.KV.put(linkId, JSON.stringify(linkInfo), {
      expirationTtl: TTL_1_DAY,
    });
  } catch (error) {
    console.error(error);
    return;
  }
}

export async function getRoutingDestinations(env: Env, linkId: string): Promise<LinkSchemaType | null> {
  try {
    const linkInfo = await getLinkInfoFromKV(env, linkId);

    if (linkInfo) return linkInfo
    const linkInfoFromDB = await getLink(linkId);
    if (!linkInfoFromDB) return null

    await saveLinkInfoToKV(env, linkId, linkInfoFromDB);

    return linkInfoFromDB;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function getDestinationForCountry(linkInfo: LinkSchemaType, countryCode?: string): string {
  if (!countryCode) {
    return linkInfo.destinations.default;
  }

  // Check if the country code exists in destinations
  if (linkInfo.destinations[countryCode]) {
    return linkInfo.destinations[countryCode];
  }

  // Fallback to default
  return linkInfo.destinations.default;
}

export async function scheduleEvalWorkflow(env: Env, event: LinkClickMessageType) {
  const doId = env.EVALUATION_SCHEDULER.idFromName(`${event.data.id}:${event.data.destination}`);
  const stub = env.EVALUATION_SCHEDULER.get(doId);

  await stub.collectLinkClick({
    accountId: event.data.accountId,
    linkId: event.data.id,
    destinationUrl: event.data.destination,
    destinationCountryCode: event.data.country || "UNKNOWN",
  })
}

export async function captureLinkClickInBackground(env: Env, event: LinkClickMessageType) {
  await env.QUEUE.send(event)

  const doId = env.LINK_CLICK_TRACKER_OBJECT.idFromName(event.data.accountId);
  const stub = env.LINK_CLICK_TRACKER_OBJECT.get(doId);

  if (!event.data.latitude || !event.data.longitude || !event.data.country) return

  await stub.addClick(
    event.data.latitude,
    event.data.longitude,
    event.data.country,
    moment().valueOf()
  )
}
