import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import sharp from 'sharp'
import { createWorker } from 'tesseract.js'

interface OcrScreenshotPayload {
  // Define your payload type here
}

export default class OcrScreenshot extends Job<OcrScreenshotPayload> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 3,
  }

  async execute() {
    await sharp('screen.png')
      .grayscale()
      .normalize()
      .threshold(150)
      .extract({ left: 100, top: 200, width: 100, height: 100 })
      .toFile('processed.png')

    const worker = await createWorker('fra')
    const {
      data: { text },
    } = await worker.recognize('processed.png')

    console.log(text)
  }

  async failed(error: Error) {
    console.error('OcrScreenshot failed:', error.message)
  }
}
