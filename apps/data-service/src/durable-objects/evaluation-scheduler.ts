import { DurableObject } from 'cloudflare:workers';
import moment from 'moment';

type ClickData = {
  linkId: string;
  accountId: string;
  destinationUrl: string;
  destinationCountryCode: string;
}

export class EvaluationScheduler extends DurableObject<Env> {
  private clickData: ClickData | undefined

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.clickData = await ctx.storage.get<ClickData>("click_data")
    })
  }

  async collectLinkClick({ linkId, accountId, destinationUrl, destinationCountryCode }: ClickData) {
    this.clickData = { linkId, accountId, destinationUrl, destinationCountryCode }
    await this.ctx.storage.put("click_data", this.clickData)

    const alarm = this.ctx.storage.getAlarm()
    if (!alarm) {
      const tenSecondsFromNow = moment().add(10, 'seconds').valueOf()
      this.ctx.storage.setAlarm(tenSecondsFromNow)
    }
  }

  async alarm() {
    console.log("EvaluationScheduler alarm")

    const clickData = this.clickData;

    if (!clickData) throw new Error("Click data not set")

    await this.env.DESTINATION_EVALUATION_WORKFLOW.create({
      params: {
        linkId: clickData.linkId,
        destinationUrl: clickData.destinationUrl,
        accountId: clickData.accountId,
      }
    })
  }
}