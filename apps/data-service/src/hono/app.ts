import { getDestinationForCountry } from '@/helpers/route-ops';
import { getLink } from '@repo/data-ops/queries/links';
import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { Hono } from 'hono';

export const App = new Hono<{ Bindings: Env }>();

App.get('/:id', async (c) => {
  const id = c.req.param('id');

  const linkInfo = await getLink(id)
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
  return c.redirect(destination)
})
