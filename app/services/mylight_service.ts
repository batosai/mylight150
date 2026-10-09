import { randomUUID } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { inject } from '@adonisjs/core'
import redis from '@adonisjs/redis/services/main'
import env from '#start/env'
import AdbService from '#services/adb_service'
import {
  batteryCapacity,
  nodeCenter,
  parseUi,
  screenState,
  type UiNode,
} from '#services/mylight_screen'

@inject()
export default class MylightService {
  constructor(private adb: AdbService) {}

  async withSession<T>(callback: (session: MylightSession | null) => Promise<T>) {
    const serial = env.get('ADB_DEVICE')
    const packageName = env.get('ADB_APP_PACKAGE_NAME')
    const connection = redis.connection('main')
    const key = `mylight150:adb:lock:${serial}`
    const token = randomUUID()
    if (!(await connection.set(key, token, 'EX', 600, 'NX'))) {
      throw new Error('Another mylight operation is using the phone')
    }
    let available = false
    try {
      const devices = await this.adb.listDevices()
      available = devices.some((device) => device.serial === serial && device.state === 'device')
      if (!available) return await callback(null)
      await this.adb.wake({ serial })
      await this.adb.unlock({ serial })
      await this.adb.launchApp(packageName, { serial, activity: '.MainActivity' })
      return await callback(new MylightSession(this.adb, serial, packageName))
    } finally {
      try {
        if (available) {
          try {
            await this.adb.forceStopApp(packageName, { serial })
          } finally {
            await this.adb.lock({ serial })
          }
        }
      } finally {
        await connection.eval(
          'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
          1,
          key,
          token
        )
      }
    }
  }
}

export class MylightSession {
  private deadline = Date.now() + 90000

  constructor(
    private adb: AdbService,
    private serial: string,
    private packageName: string
  ) {}

  private async nodes() {
    if (Date.now() >= this.deadline) throw new Error('Mylight operation timed out')
    return parseUi(await this.adb.dumpUi({ serial: this.serial }))
  }

  async status() {
    for (let attempt = 0; attempt < 4; attempt++) {
      const state = screenState(await this.nodes(), this.packageName)
      if (state !== 'unknown') return state
      await sleep(1000)
    }
    return 'unknown' as const
  }

  async readBatteryCapacity() {
    return batteryCapacity(await this.nodes(), this.packageName)
  }

  private async tap(node: UiNode | undefined) {
    if (!node || node.enabled !== 'true') throw new Error('Expected mylight control is unavailable')
    const { x, y } = nodeCenter(node)
    await this.adb.tap(x, y, { serial: this.serial })
  }

  async ensureConnected() {
    const state = await this.status()
    if (state === 'connected') return
    if (state !== 'disconnected') throw new Error('Cannot identify the mylight screen')
    const email = env.get('MYLIGHT_EMAIL')
    const password = env.get('MYLIGHT_PASSWORD')?.release()
    if (!email || !password) throw new Error('MYLIGHT_EMAIL and MYLIGHT_PASSWORD are required')
    const cooldownKey = `mylight150:login:cooldown:${this.serial}`
    if (!(await redis.connection('main').set(cooldownKey, '1', 'EX', 900, 'NX'))) {
      throw new Error('A login was recently attempted; wait 15 minutes before retrying')
    }
    let nodes = await this.nodes()
    const access = nodes.find(
      (node) => node.package === this.packageName && node['content-desc'] === 'Accéder à mon compte'
    )
    if (access) await this.tap(access)
    let formReady = false
    for (let attempt = 0; attempt < 8; attempt++) {
      nodes = await this.nodes()
      if (screenState(nodes, this.packageName) === 'connected') return
      if (nodes.some((node) => node['resource-id'] === 'signInName')) {
        formReady = true
        break
      }
      await sleep(1000)
    }
    if (!formReady) throw new Error('Mylight login form did not appear')
    // Only fill the authentication form observed on the trusted B2C host.
    const address = nodes.find((node) =>
      node['resource-id']?.endsWith('/autoCompleteTextView')
    )?.text
    if (!address || new URL(address).hostname !== 'mylightb2cprd.b2clogin.com') {
      throw new Error('Unexpected mylight authentication host')
    }
    for (const [id, value] of [
      ['signInName', email],
      ['password', password],
    ]) {
      nodes = await this.nodes()
      const field = nodes.find((node) => node['resource-id'] === id)
      // Do not append credentials to a partially completed form.
      if (!field || field.text) throw new Error('Expected an empty mylight credential field')
      await this.tap(field)
      await this.adb.inputText(value, { serial: this.serial })
      await this.adb.back({ serial: this.serial })
    }
    nodes = await this.nodes()
    await this.tap(nodes.find((node) => node['resource-id'] === 'next'))
    for (let attempt = 0; attempt < 8; attempt++) {
      await sleep(1000)
      if (screenState(await this.nodes(), this.packageName) === 'connected') return
    }
    throw new Error('Mylight login failed or requires manual verification')
  }
}
