import app from '@adonisjs/core/services/app'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
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
      .extract({ left: 860, top: 1495, width: 120, height: 45 })
      .toFile(processedPath)

    const worker = await createWorker('fra')
    const {
      data: { text },
    } = await worker.recognize(processedPath)

    console.log(text.replace('%', '').replace('\n', ''))

    await redisMain.set('mylight150_capacity', text.replace('%', '').replace('\n', ''))
  }

  async failed(error: Error) {
    console.error('OcrScreenshot failed:', error.message)
  }
}
