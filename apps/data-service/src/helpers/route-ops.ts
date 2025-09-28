import { getLink } from "@repo/data-ops/queries/links";
import { type LinkSchemaType, linkSchema } from "@repo/data-ops/zod-schema/links";

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