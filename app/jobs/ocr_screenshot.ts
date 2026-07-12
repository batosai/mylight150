import type { JobOptions } from '@adonisjs/queue/types'

import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { Job } from '@adonisjs/queue'
import redis from '@adonisjs/redis/services/main'
import sharp from 'sharp'
import { createWorker } from 'tesseract.js'

interface OcrScreenshotPayload {}

export default class OcrScreenshot extends Job<OcrScreenshotPayload> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 3,
  }

  async execute() {
    const redisMain = redis.connection('main')
    const screenshotPath = app.tmpPath('screen.png')
    const processedPath = app.tmpPath('processed.png')

    await sharp(screenshotPath)
      .grayscale()
      .normalize()
      .threshold(150)
      .extract({ left: 800, top: 1495, width: 160, height: 45 })
      .toFile(processedPath)

    const worker = await createWorker('fra')
    const {
      data: { text },
    } = await worker.recognize(processedPath)

    const value = text.replace('%', '').replace('\n', '').replace('/', '').replace('\\', '').trim()

    logger.info(value)

    await redisMain.set('mylight150_capacity', value)
  }

  async failed(error: Error) {
    logger.error('OcrScreenshot failed:', error.message)
  }
}
