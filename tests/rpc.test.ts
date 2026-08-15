import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { InteractiveNeuroPreview } from '../src/core/interactive.js'
import type { BinarySource } from '../src/core/types.js'
import { createNeuroPreviewRpcHandler } from '../src/dsh/rpc.js'
import { WorkspaceFileBrowser } from '../src/dsh/workspace-browser.js'
import { niftiInt16Fixture } from './fixture.js'

describe('NeuroPreviewer RPC Adapter', () => {
  it('opens, moves, serializes all planes, and closes through one channel handler', async () => {
    const source: BinarySource = { async read() { return niftiInt16Fixture({ dimensions: [4, 3, 2, 3] }) } }
    const preview = new InteractiveNeuroPreview(source, { createId: () => 'rpc-dataset' })
    const handler = createNeuroPreviewRpcHandler(preview)
    const signal = new AbortController().signal

    const opened = await handler('open', { path: '/workspace/sample.nii' }, signal)
    expect(opened.ok).toBe(true)
    if (!opened.ok) throw new Error(opened.error.message)
    const dataset = opened.value as Record<string, any>
    expect(dataset.datasetId).toBe('rpc-dataset')
    expect(dataset.view.frames.axial.pixelsBase64).toHaveLength(16)
    expect(dataset.view.frames.coronal.pixelsBase64).toHaveLength(12)
    expect(dataset.view.frames.sagittal.pixelsBase64).toHaveLength(8)

    const moved = await handler('view', {
      datasetId: 'rpc-dataset', x: 1, y: 2, z: 0, volume: 2,
    }, signal)
    expect(moved).toMatchObject({
      ok: true,
      value: {
        cursor: { x: 1, y: 2, z: 0, volume: 2 },
        frames: {
          axial: { index: 0, volume: 2 },
          coronal: { index: 2, volume: 2 },
          sagittal: { index: 1, volume: 2 },
        },
      },
    })

    expect(await handler('close', { datasetId: 'rpc-dataset' }, signal)).toEqual({
      ok: true,
      value: { closed: true },
    })
  })

  it('returns structured errors for malformed requests and unknown endpoints', async () => {
    const source: BinarySource = { async read() { return niftiInt16Fixture() } }
    const handler = createNeuroPreviewRpcHandler(new InteractiveNeuroPreview(source))
    const signal = new AbortController().signal
    expect(await handler('open', { path: '' }, signal)).toMatchObject({
      ok: false,
      error: { code: 'bad-request' },
    })
    expect(await handler('unknown', {}, signal)).toMatchObject({
      ok: false,
      error: { code: 'bad-request' },
    })
  })

  it('exposes registered workspaces and bounded directory listings', async () => {
    const workspace = { id: 'w1', title: 'Study', path: '/study', async status() { return 'ok' as const } }
    const ctx = {
      workspaceRegistry: { list: () => [workspace] },
      fs: {
        async resolve(path: string) { return { targetKey: path, displayPath: path } },
        contains(parent: { displayPath: string }, child: { displayPath: string }) { return child.displayPath.startsWith(parent.displayPath) },
        async stat() { return { type: 'directory', version: 'v1' } },
        async listDir() { return [{ name: 'scan.nii', type: 'file', size: 12, target: { targetKey: '/study/scan.nii', displayPath: '/study/scan.nii' } }] },
      },
    } as unknown as Context
    const source: BinarySource = { async read() { return niftiInt16Fixture() } }
    const handler = createNeuroPreviewRpcHandler(
      new InteractiveNeuroPreview(source),
      new WorkspaceFileBrowser(ctx),
    )
    const signal = new AbortController().signal

    expect(await handler('workspaces', {}, signal)).toEqual({
      ok: true,
      value: [{ id: 'w1', title: 'Study', path: '/study' }],
    })
    expect(await handler('browse', { workspaceId: 'w1' }, signal)).toMatchObject({
      ok: true,
      value: { path: '/study', entries: [{ name: 'scan.nii', type: 'file' }] },
    })
  })
})
