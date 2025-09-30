import { initDatabase } from '@repo/data-ops/database';
import { queueMessageSchema } from '@repo/data-ops/zod-schema/queue';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { App } from './hono/app';
import { handleLinkClick } from './queue-handlers/link-clicks';

export default class DataService extends WorkerEntrypoint<Env> {
	constructor(ctx: ExecutionContext, env: Env) {
		super(ctx, env);
		initDatabase(env.DB);
	}

	fetch(request: Request) {
		return App.fetch(request, this.env, this.ctx);
	}

	async queue(batch: MessageBatch<unknown>) {
		// We could distinguish between queues with different handlers here but for now we only have one
		for (const message of batch.messages) {
			const parsedMessage = queueMessageSchema.safeParse(message.body);

			if (parsedMessage.success) {
				const event = parsedMessage.data;
				switch (event.type) {
					case "LINK_CLICK":
						await handleLinkClick(this.env, event);
						break;

					default:
						break;
				}
			} else {
				console.error(parsedMessage.error)
			}
		}
	}
}
