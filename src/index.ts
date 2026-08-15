import { Buffer } from 'node:buffer'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-fs'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { InferValue } from '@deepseek-ai/dsh-tools'
import { NeuroPreviewError } from './core/nifti.js'
import { InteractiveNeuroPreview } from './core/interactive.js'
import { NeuroPreview } from './core/preview.js'
import type { CorePreviewDocument, PreviewDocument, SliceAxis } from './core/types.js'
import { DshBinarySource } from './dsh/source.js'
import { registerNeuroPreviewRpc } from './dsh/rpc.js'
import { WorkspaceFileBrowser } from './dsh/workspace-browser.js'
import type {} from '@deepseek-ai/dsh-workspace'

export * from './core/nifti.js'
export * from './core/interactive.js'
export * from './core/preview.js'
export type * from './core/types.js'

export const name = 'neuro-previewer'
export const inject = ['tools', 'fs', 'workspaceRegistry']

export interface Config {
  readonly maxFileBytes?: number
  readonly maxSlicePixels?: number
  readonly maxOpenDatasets?: number
  readonly maxTimeSeriesPoints?: number
}

const DEFAULT_MAX_FILE_BYTES = 256 * 1024 * 1024
const DEFAULT_MAX_SLICE_PIXELS = 4_194_304

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  properties: {
    kind: { type: 'string', required: true },
    format: { type: 'string', required: true },
    path: { type: 'string', required: true },
    metadata: { type: 'object', required: true, additionalProperties: true },
    frame: { type: 'object', required: true, additionalProperties: true },
    warnings: { type: 'array', required: true, items: { type: 'string' } },
  },
} as const

type ToolPreviewValue = InferValue<typeof OUTPUT_SCHEMA>

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
  const resolved = value ?? fallback
  if (!Number.isSafeInteger(resolved) || resolved < 1) throw new Error(`${name} must be a positive integer`)
  return resolved
}

function toWire(document: CorePreviewDocument): PreviewDocument {
  const { pixels, ...frame } = document.frame
  return {
    ...document,
    frame: {
      ...frame,
      pixelsBase64: Buffer.from(pixels).toString('base64'),
    },
  }
}

function summary(value: PreviewDocument): string {
  const dims = value.metadata.dimensions.join(' × ')
  const voxel = value.metadata.voxelSize.slice(0, 3).map(item => item.toFixed(3)).join(' × ')
  return [
    `NIfTI-1 preview: ${value.path}`,
    `Dimensions: ${dims}`,
    `Voxel size: ${voxel}`,
    `Datatype: ${value.metadata.datatype} (${value.metadata.bitpix} bit)`,
    `View: ${value.frame.axis} slice ${value.frame.index}, volume ${value.frame.volume}`,
    `Intensity: ${value.frame.intensityMin} … ${value.frame.intensityMax}`,
    ...value.warnings.map(warning => `Warning: ${warning}`),
  ].join('\n')
}

export function apply(ctx: Context, config: Config = {}): void {
  const maxFileBytes = positiveInteger(config.maxFileBytes, DEFAULT_MAX_FILE_BYTES, 'maxFileBytes')
  const maxSlicePixels = positiveInteger(config.maxSlicePixels, DEFAULT_MAX_SLICE_PIXELS, 'maxSlicePixels')
  const maxOpenDatasets = positiveInteger(config.maxOpenDatasets, 2, 'maxOpenDatasets')
  const maxTimeSeriesPoints = positiveInteger(config.maxTimeSeriesPoints, 1024, 'maxTimeSeriesPoints')
  const source = new DshBinarySource(ctx, maxFileBytes)
  const preview = new NeuroPreview(source, { maxSlicePixels })
  const interactivePreview = new InteractiveNeuroPreview(source, {
    maxSlicePixels,
    maxOpenDatasets,
    maxTimeSeriesPoints,
  })
  registerNeuroPreviewRpc(ctx, interactivePreview, new WorkspaceFileBrowser(ctx))

  ctx.tools.register(defineTool({
    name: 'neuro_preview',
    description: 'Open a neuroscience data preview. Supports interactive spatial and time navigation for single-file NIfTI-1 .nii images.',
    parameters: {
      path: { type: 'string', required: true, description: 'Path to the neuroscience data file.' },
      axis: {
        type: 'string',
        enum: ['axial', 'coronal', 'sagittal'],
        description: 'Slice orientation. Defaults to axial.',
      },
      index: { type: 'integer', description: 'Zero-based slice index. Defaults to the middle slice.' },
      volume: { type: 'integer', description: 'Zero-based 4D volume index. Defaults to 0.' },
    },
    output: {
      schema: {
        ...OUTPUT_SCHEMA,
      },
      render: (_args, value) => [{ type: 'text', text: summary(value as unknown as PreviewDocument) }],
      presentationMeta: (_args, value) => ({ neuroPreview: value }),
    },
    async execute(args, exec) {
      try {
        const document = await preview.inspect({
          path: args.path,
          ...(args.axis === undefined ? {} : { axis: args.axis as SliceAxis }),
          ...(args.index === undefined ? {} : { index: args.index }),
          ...(args.volume === undefined ? {} : { volume: args.volume }),
        }, exec.signal)
        return toWire(document) as unknown as ToolPreviewValue
      } catch (error) {
        if (error instanceof NeuroPreviewError) throw new Error(`${error.code}: ${error.message}`)
        throw error
      }
    },
    presentCall: args => ({
      card: 'generic',
      title: `Preview neuroscience data: ${args.path}`,
      kind: 'read',
      rawInput: args.path,
      locations: [{ path: args.path }],
    }),
  }))
}
