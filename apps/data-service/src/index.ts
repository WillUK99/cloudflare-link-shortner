import { initDatabase } from '@repo/data-ops/database';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { App } from './hono/app';

export default class DataService extends WorkerEntrypoint<Env> {
	constructor(ctx: ExecutionContext, env: Env) {
		super(ctx, env);
		initDatabase(env.DB);
	}

	fetch(request: Request) {
		return App.fetch(request, this.env, this.ctx);
	}
}
