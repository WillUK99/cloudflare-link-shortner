import { deleteClicksBefore, getRecentClicks } from "@/helpers/durable-queries";
import { DurableObject } from "cloudflare:workers";
import moment from "moment";

// Link tracker is tied to the users account and should track the clicks an accounts links have received
export class LinkClickTracker extends DurableObject<Env> {
  private sql: SqlStorage;
  private oldestOffsetTime: number = 0;
  private newestOffsetTime: number = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;

    ctx.blockConcurrencyWhile(async () => {
      const [oldest, newest] = await Promise.all([
        ctx.storage.get<number>("oldestOffsetTime"),
        ctx.storage.get<number>("newestOffsetTime"),
      ])

      this.oldestOffsetTime = oldest ?? this.oldestOffsetTime;
      this.newestOffsetTime = newest ?? this.newestOffsetTime;
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
    const alarm = await this.ctx.storage.getAlarm();
    if (!alarm) await this.ctx.storage.setAlarm(moment().add(2, 'seconds').valueOf());
  }

  async alarm() {
    console.log('alarm')
    const clickData = await getRecentClicks(this.sql, this.newestOffsetTime, 50);

    const sockets = this.ctx.getWebSockets();
    for (const socket of sockets) {
      socket.send(JSON.stringify(clickData.clicks));
    }

    await this.flushOffsetTimes({ newestOffsetTime: clickData.mostRecentTime, oldestOffsetTime: clickData.oldestTime });
    await deleteClicksBefore(this.sql, clickData.oldestTime)
  }

  async flushOffsetTimes({ newestOffsetTime, oldestOffsetTime }: { newestOffsetTime: number, oldestOffsetTime: number }) {
    this.newestOffsetTime = newestOffsetTime;
    this.oldestOffsetTime = oldestOffsetTime;

    await Promise.all([
      this.ctx.storage.put('newestOffsetTime', this.newestOffsetTime),
      this.ctx.storage.put('oldestOffsetTime', this.oldestOffsetTime),
    ]);
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

  webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): void | Promise<void> {
    console.log("client closed")
  }
} 
