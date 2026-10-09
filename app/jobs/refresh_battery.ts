import type { JobOptions } from '@adonisjs/queue/types'
import { setTimeout as sleep } from 'node:timers/promises'
import logger from '@adonisjs/core/services/logger'
import redis from '@adonisjs/redis/services/main'
import { Job } from '@adonisjs/queue'
import { inject } from '@adonisjs/core'
import AdbService from '#services/adb_service'
import MylightService from '#services/mylight_service'
import env from '#start/env'

interface RefreshBatteryPayload {}

const REFRESH_SWIPE_START_X = 540
const REFRESH_SWIPE_START_Y = 600
const REFRESH_SWIPE_END_X = 540
const REFRESH_SWIPE_END_Y = 1800
const REFRESH_SWIPE_DURATION_MS = 350
const RELOAD_WAIT_MS = 3000

@inject()
export default class RefreshBattery extends Job<RefreshBatteryPayload> {
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
      const capacity = await session.readBatteryCapacity()
      await redis.connection('main').set('mylight150_capacity', String(capacity))
      logger.info({ capacity }, 'Mylight battery capacity updated')
    })
  }

  async failed(error: Error) {
    logger.error('RefreshBattery failed:', error.message)
  }
}
