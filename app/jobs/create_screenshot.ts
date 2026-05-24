import type { JobOptions } from '@adonisjs/queue/types'
import { setTimeout as sleep } from 'node:timers/promises'

import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import { inject } from '@adonisjs/core'
import OCRScreenshot from '#jobs/ocr_screenshot'
import AdbService from '#services/adb_service'
import env from '#start/env'

interface CreateScreenshotPayload {}

const REFRESH_SWIPE_START_X = 540
const REFRESH_SWIPE_START_Y = 600
const REFRESH_SWIPE_END_X = 540
const REFRESH_SWIPE_END_Y = 1800
const REFRESH_SWIPE_DURATION_MS = 350
const RELOAD_WAIT_MS = 3000

@inject()
export default class CreateScreenshot extends Job<CreateScreenshotPayload> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 3,
  }

  constructor(private adb: AdbService) {
    super()
  }

  async execute() {
    const serial = env.get('ADB_DEVICE')
    const packageName = env.get('ADB_APP_PACKAGE_NAME')
    const screenshotPath = app.tmpPath('screen.png')
    const activity = '.MainActivity'

    await this.adb.wake({ serial })
    await this.adb.unlock({ serial })
    await this.adb.launchApp(packageName, { serial, activity })
    await sleep(RELOAD_WAIT_MS)
    await this.adb.swipe(
      REFRESH_SWIPE_START_X,
      REFRESH_SWIPE_START_Y,
      REFRESH_SWIPE_END_X,
      REFRESH_SWIPE_END_Y,
      REFRESH_SWIPE_DURATION_MS,
      { serial }
    )
    await sleep(RELOAD_WAIT_MS)
    await this.adb.screencap(screenshotPath, { serial })
    await this.adb.lock({ serial })

    await OCRScreenshot.dispatch({})
  }

  async failed(error: Error) {
    logger.error('CreateScreenshot failed:', error.message)
  }
}
