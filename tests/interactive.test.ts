import { describe, expect, it } from 'vitest'
import { InteractiveNeuroPreview } from '../src/core/interactive.js'
import type { BinarySource } from '../src/core/types.js'
import { niftiInt16Fixture } from './fixture.js'

function sourceFor(bytes: Uint8Array): BinarySource {
  return { async read() { return bytes } }
}

describe('InteractiveNeuroPreview', () => {
  it('opens a dataset and returns linked orthogonal frames plus a time series', async () => {
    const bytes = niftiInt16Fixture({ dimensions: [4, 3, 2, 4], slope: 1, intercept: 0 })
    const preview = new InteractiveNeuroPreview(sourceFor(bytes), { createId: () => 'dataset-1' })
    const opened = await preview.open('/workspace/sample.nii')

    expect(opened).toMatchObject({
      datasetId: 'dataset-1',
      path: '/workspace/sample.nii',
      metadata: { dimensions: [4, 3, 2, 4] },
      view: {
        cursor: { x: 2, y: 1, z: 1, volume: 0 },
        frames: {
          axial: { axis: 'axial', index: 1, volume: 0 },
          coronal: { axis: 'coronal', index: 1, volume: 0 },
          sagittal: { axis: 'sagittal', index: 2, volume: 0 },
        },
        timeSeries: { indices: [0, 1, 2, 3], values: [112, 1112, 2112, 3112] },
      },
    })

    const moved = preview.view({ datasetId: 'dataset-1', x: 1, y: 2, z: 0, volume: 3 })
    expect(moved.cursor).toEqual({ x: 1, y: 2, z: 0, volume: 3 })
    expect(moved.cursorValue).toBe(3021)
    expect(moved.frames.axial).toMatchObject({ index: 0, volume: 3 })
    expect(moved.frames.coronal).toMatchObject({ index: 2, volume: 3 })
    expect(moved.frames.sagittal).toMatchObject({ index: 1, volume: 3 })
  })

  it('evicts the least recently used dataset and closes explicitly', async () => {
    let sequence = 0
    const preview = new InteractiveNeuroPreview(sourceFor(niftiInt16Fixture()), {
      maxOpenDatasets: 1,
      createId: () => `dataset-${++sequence}`,
    })
    await preview.open('one.nii')
    await preview.open('two.nii')
    expect(preview.openDatasetCount).toBe(1)
    expect(() => preview.view({ datasetId: 'dataset-1', x: 0, y: 0, z: 0, volume: 0 })).toThrow(/not open/)
    expect(preview.close('dataset-2')).toBe(true)
    expect(preview.openDatasetCount).toBe(0)
  })
})
