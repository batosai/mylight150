import { writeFile } from 'node:fs/promises'

import { execa } from 'execa'
import type { Options as ExecaOptions } from 'execa'

export interface AdbDevice {
  serial: string
  state: string
}

export interface AdbTargetOptions {
  serial?: string
}

export interface AdbLaunchAppOptions extends AdbTargetOptions {
  activity?: string
}

type AdbCommandOptions = Pick<ExecaOptions, 'encoding' | 'stripFinalNewline'>

export default class AdbService {
  async listDevices() {
    const { stdout } = await this.execute('adb', ['devices'])

    if (typeof stdout !== 'string') {
      throw new TypeError('Expected adb devices to return text output')
    }

    return stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && line !== 'List of devices attached' && !line.startsWith('*'))
      .map((line) => {
        const [serial, state] = line.split(/\s+/, 2)

        return {
          serial,
          state,
        }
      })
  }

  async screencap(destinationPath: string, options: AdbTargetOptions = {}) {
    const { stdout } = await this.execute(
      'adb',
      [...this.targetArgs(options), 'exec-out', 'screencap', '-p'],
      {
        encoding: 'buffer',
        stripFinalNewline: false,
      }
    )

    if (typeof stdout === 'string') {
      throw new TypeError('Expected adb screencap to return binary output')
    }

    await this.persistFile(destinationPath, stdout)

    return destinationPath
  }

  async tap(x: number, y: number, options: AdbTargetOptions = {}) {
    await this.runInputCommand(options, ['tap', x, y])
  }

  async swipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs?: number,
    options: AdbTargetOptions = {}
  ) {
    const coordinates = [startX, startY, endX, endY]
    const duration = durationMs === undefined ? [] : [durationMs]

    await this.runInputCommand(options, ['swipe', ...coordinates, ...duration])
  }

  async longPress(x: number, y: number, durationMs = 500, options: AdbTargetOptions = {}) {
    await this.swipe(x, y, x, y, durationMs, options)
  }

  async wake(options: AdbTargetOptions = {}) {
    await this.runKeyEventCommand(options, 'KEYCODE_WAKEUP')
  }

  async unlock(options: AdbTargetOptions = {}) {
    await this.runKeyEventCommand(options, 'KEYCODE_MENU')
  }

  async launchApp(packageName: string, options: AdbLaunchAppOptions = {}) {
    if (options.activity) {
      await this.runShellCommand(options, [
        'am',
        'start',
        '-n',
        `${packageName}/${options.activity}`,
      ])
      return
    }

    await this.execute('adb', [
      ...this.targetArgs(options),
      'shell',
      'monkey',
      '-p',
      packageName,
      '-c',
      'android.intent.category.LAUNCHER',
      '1',
    ])
  }

  protected execute(
    command: string,
    args: readonly string[],
    options?: AdbCommandOptions
  ): Promise<{ stdout: string | Uint8Array }> {
    return execa(command, args, options)
  }

  protected persistFile(destinationPath: string, data: Uint8Array) {
    return writeFile(destinationPath, data)
  }

  private runInputCommand(options: AdbTargetOptions, args: readonly [string, ...number[]]) {
    return this.execute('adb', [
      ...this.targetArgs(options),
      'shell',
      'input',
      ...args.map((value) => String(value)),
    ])
  }

  private runKeyEventCommand(options: AdbTargetOptions, keyEvent: string) {
    return this.execute('adb', [
      ...this.targetArgs(options),
      'shell',
      'input',
      'keyevent',
      keyEvent,
    ])
  }

  private runShellCommand(options: AdbTargetOptions, args: readonly string[]) {
    return this.execute('adb', [...this.targetArgs(options), 'shell', ...args])
  }

  private targetArgs({ serial }: AdbTargetOptions) {
    return serial ? ['-s', serial] : []
  }
}
