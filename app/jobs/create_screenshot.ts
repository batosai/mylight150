import type { JobOptions } from '@adonisjs/queue/types'
import { setTimeout as sleep } from 'node:timers/promises'
import { randomUUID } from 'node:crypto'
import { copyFile } from 'node:fs/promises'

import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import { inject } from '@adonisjs/core'
import OCRScreenshot from '#jobs/ocr_screenshot'
import AdbService from '#services/adb_service'
import MylightService from '#services/mylight_service'
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

  constructor(
    private adb: AdbService,
    private mylight: MylightService
  ) {
    super()
  }

  async execute() {
    const serial = env.get('ADB_DEVICE')
    const screenshotName = `screen-${randomUUID()}.png`
    const screenshotPath = app.tmpPath(screenshotName)
    await this.mylight.withSession(async (session) => {
      if (!session) throw new Error('ADB device unavailable')
      await session.ensureConnected()
      await this.adb.swipe(
        REFRESH_SWIPE_START_X,
        REFRESH_SWIPE_START_Y,
        REFRESH_SWIPE_END_X,
        REFRESH_SWIPE_END_Y,
        REFRESH_SWIPE_DURATION_MS,
        { serial }
      )
      await sleep(RELOAD_WAIT_MS)
      if ((await session.status()) !== 'connected') {
        throw new Error('Mylight is not connected after refresh')
      }
      await this.adb.screencap(screenshotPath, { serial })
      // Keep the latest capture available to screenshot:ocr and sync:tmp.
      await copyFile(screenshotPath, app.tmpPath('screen.png'))
    })

    await OCRScreenshot.dispatch({ screenshotName })
  }

  async failed(error: Error) {
    logger.error('CreateScreenshot failed:', error.message)
  }
}
