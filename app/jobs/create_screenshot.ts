import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'

interface CreateScreenshotPayload {
  // Define your payload type here
}

export default class CreateScreenshot extends Job<CreateScreenshotPayload> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 3,
  }

  async execute() {
    // Your job logic here
    console.log('Processing CreateScreenshot', this.payload)
  }

  async failed(error: Error) {
    console.error('CreateScreenshot failed:', error.message)
  }
}
