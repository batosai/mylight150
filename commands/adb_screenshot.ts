import type { CommandOptions } from '@adonisjs/core/types/ace'

import { BaseCommand } from '@adonisjs/core/ace'
import app from '@adonisjs/core/services/app'
import AdbService from '#services/adb_service'
import MylightService from '#services/mylight_service'
import env from '#start/env'

export default class Screenshot extends BaseCommand {
  static commandName = 'adb:screenshot'
  static description = 'Capture the mylight screen for diagnostics'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const mylight = await this.app.container.make(MylightService)
    const adb = await this.app.container.make(AdbService)
    await mylight.withSession(async (session) => {
      if (!session) throw new Error('ADB device unavailable')
      await session.ensureConnected()
      const path = app.tmpPath('screen.png')
      await adb.screencap(path, { serial: env.get('ADB_DEVICE') })
      this.logger.success(path)
    })
  }
}
