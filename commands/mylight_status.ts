import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import MylightService from '#services/mylight_service'

export default class MylightStatus extends BaseCommand {
  static commandName = 'mylight:status'
  static description = 'Check the mylight Android session'
  static options: CommandOptions = { startApp: true }

  async run() {
    const service = await this.app.container.make(MylightService)
    const state = await service.withSession(async (session) =>
      session ? session.status() : 'device-unavailable'
    )
    this.logger.info(state)
    if (state !== 'connected') this.exitCode = 1
  }
}
