import type { JobOptions } from '@adonisjs/queue/types'
import { unlink } from 'node:fs/promises'

import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import redis from '@adonisjs/redis/services/main'
import sharp from 'sharp'
import { createWorker } from 'tesseract.js'

interface OcrScreenshotPayload {
  screenshotName?: string
}

export default class OcrScreenshot extends Job<OcrScreenshotPayload> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 3,
  }

  async execute() {
    const redisMain = redis.connection('main')
    const screenshotName = this.payload.screenshotName ?? 'screen.png'
    if (!/^screen(?:-[\da-f-]{36})?\.png$/.test(screenshotName)) {
      throw new Error('Invalid screenshot filename')
    }
    const screenshotPath = app.tmpPath(screenshotName)
    const processedPath = app.tmpPath(`${screenshotName}.processed.png`)

    await sharp(screenshotPath)
      .grayscale()
      .normalize()
      .threshold(180)
      .extract({ left: 800, top: 1500, width: 160, height: 45 })
      .toFile(processedPath)

    const worker = await createWorker('fra')
    let text: string
    try {
      const result = await worker.recognize(processedPath)
      text = result.data.text
    } finally {
      await worker.terminate()
    }

    const value =
      text
        .match(/\d+/g)
        ?.map((candidate) => Number.parseInt(candidate, 10))
        .filter((candidate) => candidate >= 0 && candidate <= 100)
        .at(-1)
        ?.toString() ?? ''

    if (!value) {
      throw new Error('No valid battery capacity found; previous value preserved')
    }
    logger.info(value)

    await redisMain.set('mylight150_capacity', value)
    if (this.payload.screenshotName) {
      await Promise.allSettled([unlink(screenshotPath), unlink(processedPath)])
    }
  }

  async failed(error: Error) {
    logger.error('OcrScreenshot failed:', error.message)
  }
}
