import { DurableObject } from "cloudflare:workers";

// Link tracker is tied to the users account and should track the clicks an accounts links have received
export class LinkClickTracker extends DurableObject<Env> {
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;

    ctx.blockConcurrencyWhile(async () => {
      // Should probably use drizzle here https://orm.drizzle.team/docs/connect-cloudflare-do
      this.sql.exec(`
          CREATE TABLE IF NOT EXISTS geo_link_clicks (
              latitude REAL NOT NULL,
              longitude REAL NOT NULL,
              country TEXT NOT NULL,
              time INTEGER NOT NULL
          )
      `);
    })
  }

  async addClick(latitude: number, longitude: number, country: string, time: number) {
    // Should probably use drizzle here https://orm.drizzle.team/docs/connect-cloudflare-do
    this.sql.exec(
      `
			INSERT INTO geo_link_clicks (latitude, longitude, country, time)
			VALUES (?, ?, ?, ?)
			`,
      latitude,
      longitude,
      country,
      time,
    );
  }

  async fetch(_: Request) {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair)

    this.ctx.acceptWebSocket(server)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }
} 
