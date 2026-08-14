import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-fs'
import type { BinarySource } from '../core/types.js'

export class DshBinarySource implements BinarySource {
  constructor(
    private readonly ctx: Context,
    private readonly maxFileBytes: number,
  ) {}

  async read(path: string, signal?: AbortSignal): Promise<Uint8Array> {
    const target = await this.ctx.fs.resolve(path, signal === undefined ? undefined : { signal })
    const info = await this.ctx.fs.stat(target, signal)
    if (info === undefined) throw new Error(`File not found: ${path}`)
    if (info.type !== 'file') throw new Error(`Not a regular file: ${path}`)
    if (info.size !== undefined && info.size > this.maxFileBytes) {
      throw new Error(`File is ${info.size} bytes; limit is ${this.maxFileBytes} bytes`)
    }
    return this.ctx.fs.readBytes(target, signal, this.maxFileBytes)
  }
}
