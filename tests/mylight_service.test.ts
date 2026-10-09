import 'reflect-metadata'
import assert from 'node:assert/strict'
import { test, mock, after } from 'node:test'
import { Ignitor } from '@adonisjs/core'
import env from '../start/env.js'
import AdbService from '../app/services/adb_service.js'

const root = new URL('../', import.meta.url)
const app = new Ignitor(root, {
  importer: (path) => import(path.startsWith('.') ? new URL(path, root).href : path),
}).createApp('console')
await app.init()
const { default: queueConfig } = await import('../config/queue.js')
queueConfig.default = 'sync'
Reflect.deleteProperty(queueConfig.adapters, 'redis')
await app.boot()
const { default: redis } = await import('@adonisjs/redis/services/main')
const { default: MylightService, MylightSession } =
  await import('../app/services/mylight_service.js')
after(() => app.terminate())

class FakeAdb extends AdbService {
  events: string[] = []
  available = true
  async listDevices() {
    return this.available ? [{ serial: 'test-phone', state: 'device' }] : []
  }
  async wake() {
    this.events.push('wake')
  }
  async unlock() {
    this.events.push('unlock')
  }
  async launchApp() {
    this.events.push('launch')
  }
  async forceStopApp() {
    this.events.push('stop')
  }
  async lock() {
    this.events.push('sleep')
  }
  async dumpUi() {
    return '<hierarchy><node package="test-app" content-desc="Batterie virtuelle&#10;40%" /></hierarchy>'
  }
}

test('shared lock protects commands and cleanup runs after callback failure', async () => {
  const events: string[] = []
  mock.method(env, 'get', (key: string) => (key === 'ADB_DEVICE' ? 'test-phone' : 'test-app'))
  mock.method(redis, 'connection', () => ({
    async set() {
      events.push('acquire')
      return 'OK'
    },
    async eval() {
      events.push('release')
      return 1
    },
  }))
  try {
    const adb = new FakeAdb()
    await assert.rejects(
      new MylightService(adb).withSession(async (session) => {
        assert.ok(session)
        await session.ensureConnected()
        throw new Error('capture failed')
      }),
      /capture failed/
    )
    assert.deepEqual(adb.events, ['wake', 'unlock', 'launch', 'stop', 'sleep'])
    assert.deepEqual(events, ['acquire', 'release'])
  } finally {
    mock.restoreAll()
  }
})

test('unavailable device releases lock without waking the phone', async () => {
  let released = false
  mock.method(env, 'get', () => 'test-phone')
  mock.method(redis, 'connection', () => ({
    async set() {
      return 'OK'
    },
    async eval() {
      released = true
      return 1
    },
  }))
  try {
    const adb = new FakeAdb()
    adb.available = false
    assert.equal(await new MylightService(adb).withSession(async (session) => session), null)
    assert.equal(released, true)
    assert.deepEqual(adb.events, [])
  } finally {
    mock.restoreAll()
  }
})

test('contended lock prevents any ADB operation', async () => {
  mock.method(env, 'get', () => 'test-phone')
  mock.method(redis, 'connection', () => ({
    async set() {
      return null
    },
  }))
  try {
    const adb = new FakeAdb()
    await assert.rejects(
      new MylightService(adb).withSession(async () => {}),
      /Another mylight operation/
    )
    assert.deepEqual(adb.events, [])
  } finally {
    mock.restoreAll()
  }
})

test('reconnect fills the trusted form once and confirms the app dashboard', async () => {
  class LoginAdb extends FakeAdb {
    connected = false
    async dumpUi() {
      if (this.connected) return super.dumpUi()
      return `<hierarchy>
        <node resource-id="org.lineageos.jelly:id/autoCompleteTextView" text="https://mylightb2cprd.b2clogin.com/authorize" />
        <node resource-id="signInName" text="" enabled="true" bounds="[0,0][100,100]" />
        <node resource-id="password" text="" enabled="true" bounds="[0,100][100,200]" />
        <node resource-id="next" enabled="true" bounds="[300,0][400,100]" />
      </hierarchy>`
    }
    async tap(x: number) {
      if (x === 350) {
        this.events.push('submit')
        this.connected = true
      }
    }
    async inputText() {
      this.events.push('input')
    }
    async back() {
      this.events.push('back')
    }
  }
  mock.method(env, 'get', (key: string) =>
    key === 'MYLIGHT_EMAIL' ? 'test@example.com' : { release: () => 'test-password' }
  )
  mock.method(redis, 'connection', () => ({
    async set() {
      return 'OK'
    },
  }))
  try {
    const adb = new LoginAdb()
    await new MylightSession(adb, 'test-phone', 'test-app').ensureConnected()
    assert.deepEqual(adb.events, ['input', 'back', 'input', 'back', 'submit'])
  } finally {
    mock.restoreAll()
  }
})

test('credentials are never included in Android input errors', async () => {
  class FailingAdb extends AdbService {
    protected async execute(): Promise<{ stdout: string }> {
      throw new Error('command containing secret')
    }
  }
  await assert.rejects(new FailingAdb().inputText('test-password'), {
    message: 'Android credential input failed',
  })
  await assert.rejects(
    new FailingAdb().inputText('contains spaces'),
    /Unsupported credential format/
  )
})
