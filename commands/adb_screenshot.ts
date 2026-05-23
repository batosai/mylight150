import type { CommandOptions } from '@adonisjs/core/types/ace'

import { BaseCommand } from '@adonisjs/core/ace'
import CreateScreenshot from '#jobs/create_screenshot'

export default class Screenshot extends BaseCommand {
  static commandName = 'adb:screenshot'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const queue = await this.app.container.make('queue.manager')
    await queue.loadJobs()
    await CreateScreenshot.dispatch({})
  }
}
