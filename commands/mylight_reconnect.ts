import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import MylightService from '#services/mylight_service'

export default class MylightReconnect extends BaseCommand {
  static commandName = 'mylight:reconnect'
  static description = 'Reconnect mylight if the Android session is disconnected'
  static options: CommandOptions = { startApp: true }

  async run() {
    const service = await this.app.container.make(MylightService)
    await service.withSession(async (session) => {
      if (!session) throw new Error('ADB device unavailable')
      await session.ensureConnected()
      this.logger.success('connected')
    })
  }
}
