import { describe, expect, it } from 'vitest'
import { NeuroPreview } from '../src/core/preview.js'
import type { BinarySource } from '../src/core/types.js'
import { niftiInt16Fixture } from './fixture.js'

class MemorySource implements BinarySource {
  readonly requests: string[] = []

  async read(path: string, signal?: AbortSignal): Promise<Uint8Array> {
    this.requests.push(path)
    if (signal?.aborted) throw signal.reason
    return niftiInt16Fixture()
  }
}

describe('NeuroPreview', () => {
  it('keeps format parsing behind one format-neutral interface', async () => {
    const source = new MemorySource()
    const preview = new NeuroPreview(source)
    const result = await preview.inspect({ path: '/data/subject.nii', axis: 'sagittal', index: 1 })
    expect(source.requests).toEqual(['/data/subject.nii'])
    expect(result.frame).toMatchObject({ axis: 'sagittal', index: 1, width: 3, height: 2 })
  })

  it('does not read when already cancelled', async () => {
    const source = new MemorySource()
    const preview = new NeuroPreview(source)
    const controller = new AbortController()
    controller.abort(new Error('cancelled'))
    await expect(preview.inspect({ path: 'sample.nii' }, controller.signal)).rejects.toThrow('cancelled')
    expect(source.requests).toEqual([])
  })
})
