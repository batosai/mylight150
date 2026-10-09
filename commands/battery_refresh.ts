import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import RefreshBattery from '#jobs/refresh_battery'

export default class BatteryRefresh extends BaseCommand {
  static commandName = 'battery:refresh'
  static description = 'Queue a battery reading from the Android UI'
  static options: CommandOptions = { startApp: true }

  async run() {
    const queue = await this.app.container.make('queue.manager')
    await queue.loadJobs()
    await RefreshBattery.dispatch({})
    this.logger.success('Battery refresh queued')
  }
}
