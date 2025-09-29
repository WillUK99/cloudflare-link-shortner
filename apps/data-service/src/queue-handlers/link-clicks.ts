import { addLinkClick } from "@repo/data-ops/queries/link-clicks";
import { LinkClickMessageType } from "@repo/data-ops/zod-schema/queue";


export async function handleLinkClick(_env: Env, event: LinkClickMessageType) {
  await addLinkClick(event.data);
}