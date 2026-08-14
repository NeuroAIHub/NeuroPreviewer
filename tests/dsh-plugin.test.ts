import type { Context } from '@deepseek-ai/cordis'
import type { JsonValue, ToolDefinition, ToolRunContext } from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import { apply } from '../src/index.js'
import { niftiInt16Fixture } from './fixture.js'

describe('DSH plugin Adapter', () => {
  it('registers and executes neuro_preview through the filesystem capability', async () => {
    let tool: ToolDefinition | undefined
    const bytes = niftiInt16Fixture()
    const target = { targetKey: 'fixture', displayPath: '/workspace/fixture.nii' }
    const ctx = {
      tools: {
        register(definition: ToolDefinition) {
          tool = definition
          return () => {}
        },
      },
      fs: {
        async resolve() { return target },
        async stat() { return { type: 'file', size: bytes.byteLength, version: 'v1' } },
        async readBytes() { return bytes },
      },
    } as unknown as Context

    apply(ctx, { maxFileBytes: 1024 * 1024, maxSlicePixels: 1024 })
    expect(tool?.name).toBe('neuro_preview')
    if (tool === undefined) throw new Error('tool was not registered')

    const args = { path: '/workspace/fixture.nii', axis: 'coronal', index: 1, volume: 0 }
    const value = await tool.execute(args, {
      signal: new AbortController().signal,
    } as ToolRunContext) as Record<string, unknown>

    expect(value).toMatchObject({
      kind: 'neuro-preview',
      format: 'nifti-1',
      path: '/workspace/fixture.nii',
      frame: { axis: 'coronal', index: 1, width: 4, height: 2 },
    })
    expect((value.frame as { pixelsBase64: string }).pixelsBase64).toHaveLength(12)

    const rendered = tool.output.render(args, value as JsonValue)
    expect(rendered[0]).toMatchObject({ type: 'text' })
    expect((rendered[0] as { text: string }).text).toContain('Dimensions: 4 × 3 × 2 × 1')
    expect(tool.output.presentationMeta?.(args, value as JsonValue)).toEqual({ neuroPreview: value })
  })
})
