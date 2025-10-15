import { captureLinkClickInBackground, getDestinationForCountry, getRoutingDestinations } from '@/helpers/route-ops';
import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';
import { Hono } from 'hono';

export const App = new Hono<{ Bindings: Env }>();


App.get('/link-click/:accountId', async (c) => {
  const accountId = c.req.param('accountId')
  const doId = c.env.LINK_CLICK_TRACKER_OBJECT.idFromName(accountId);
  const stub = c.env.LINK_CLICK_TRACKER_OBJECT.get(doId);
  return await stub.fetch(c.req.raw)
})

App.get('/:id', async (c) => {
  const id = c.req.param('id');

  const linkInfo = await getRoutingDestinations(c.env, id)
  if (!linkInfo) {
    return c.text('Destination not found', 404);
  }

  const cfHeaders = cloudflareInfoSchema.safeParse(c.req.raw.cf)
  if (!cfHeaders.success) {
    const destination = getDestinationForCountry(linkInfo) // if no headers, default to default destination
    return c.redirect(destination)
  }

  const headers = cfHeaders.data
  console.log(headers)
  const destination = getDestinationForCountry(linkInfo, headers.country)

  // Sending this data to the queue as to not block the request for longer than it needs to be
  const queueMessage: LinkClickMessageType = {
    type: "LINK_CLICK",
    data: {
      id: id,
      country: headers.country,
      destination: destination,
      accountId: linkInfo.accountId,
      latitude: headers.latitude,
      longitude: headers.longitude,
      timestamp: new Date().toISOString()
    }
  }

  // Can only pass a single promise to waitUntil so captureLinkClickInBackground wraps the queue and DO calls
  c.executionCtx.waitUntil(
    captureLinkClickInBackground(c.env, queueMessage)
  )

  return c.redirect(destination)
})
