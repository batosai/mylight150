import type { CommandOptions } from '@adonisjs/core/types/ace'

import { BaseCommand } from '@adonisjs/core/ace'
import OcrScreenshot from '#jobs/ocr_screenshot'

export default class Ocr extends BaseCommand {
  static commandName = 'screenshot:ocr'

  static options: CommandOptions = {}

  async run() {
    const queue = await this.app.container.make('queue.manager')
    await queue.loadJobs()
    await OcrScreenshot.dispatch({})
  }
}
