import type { JobOptions } from '@adonisjs/queue/types'
import type AdbService from '#services/adb_service'

import app from '@adonisjs/core/services/app'
import { Job } from '@adonisjs/queue'
import OCRScreenshot from '#jobs/ocr_screenshot'
import env from '#start/env'

interface CreateScreenshotPayload {}

const APP_PACKAGE_NAME = process.env.ADB_APP_PACKAGE_NAME ?? 'com.example.app'
const SCREENSHOT_PATH = app.tmpPath('screen.png')

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
    const activity = '.MainActivity'

    await this.adb.wake({ serial })
    await this.adb.unlock({ serial })
    await this.adb.launchApp(APP_PACKAGE_NAME, { serial, activity })
    await this.adb.screencap(SCREENSHOT_PATH, { serial })

    await OCRScreenshot.dispatch({})
  }

  async failed(error: Error) {
    console.error('CreateScreenshot failed:', error.message)
  }
}
