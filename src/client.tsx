import { useEffect, useRef } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type { PreviewDocument } from './core/types.js'

export const inject = ['slots']

function isPreviewDocument(value: unknown): value is PreviewDocument {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<PreviewDocument>
  return candidate.kind === 'neuro-preview'
    && candidate.format === 'nifti-1'
    && typeof candidate.frame === 'object'
    && candidate.frame !== null
    && typeof candidate.frame.pixelsBase64 === 'string'
}

function previewFromMeta(meta: unknown): PreviewDocument | undefined {
  if (typeof meta !== 'object' || meta === null) return undefined
  const value = (meta as { neuroPreview?: unknown }).neuroPreview
  return isPreviewDocument(value) ? value : undefined
}

function SliceCanvas({ preview }: { readonly preview: PreviewDocument }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (canvas === null) return
    const binary = atob(preview.frame.pixelsBase64)
    const context = canvas.getContext('2d')
    if (context === null) return
    const image = context.createImageData(preview.frame.width, preview.frame.height)
    for (let i = 0; i < binary.length; i += 1) {
      const value = binary.charCodeAt(i)
      const offset = i * 4
      image.data[offset] = value
      image.data[offset + 1] = value
      image.data[offset + 2] = value
      image.data[offset + 3] = 255
    }
    context.putImageData(image, 0, 0)
  }, [preview])

  return (
    <canvas
      ref={ref}
      width={preview.frame.width}
      height={preview.frame.height}
      aria-label={`${preview.frame.axis} NIfTI slice ${preview.frame.index}`}
      style={{
        width: 'min(100%, 360px)',
        aspectRatio: `${preview.frame.width} / ${preview.frame.height}`,
        imageRendering: 'pixelated',
        background: '#090b10',
        borderRadius: 8,
      }}
    />
  )
}

export function NeuroPreviewRow({ block }: ToolCallViewProps) {
  if (!('kind' in block) || block.kind !== 'tool-result') {
    return <div style={{ padding: '8px 0', opacity: 0.72 }}>Loading neuroscience preview…</div>
  }
  const preview = previewFromMeta(block.meta)
  if (preview === undefined) {
    return <div style={{ padding: '8px 0', color: 'var(--color-danger, #d44)' }}>Preview data is unavailable.</div>
  }
  return (
    <section style={{ display: 'grid', gap: 10, padding: '10px 0' }}>
      <header style={{ display: 'grid', gap: 2 }}>
        <strong>NIfTI preview</strong>
        <span style={{ opacity: 0.72, overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview.path}</span>
      </header>
      <SliceCanvas preview={preview} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 12, opacity: 0.8 }}>
        <span>{preview.metadata.dimensions.join(' × ')}</span>
        <span>{preview.metadata.datatype}</span>
        <span>{preview.frame.axis} {preview.frame.index}</span>
        <span>volume {preview.frame.volume}</span>
        <span>{preview.frame.intensityMin.toPrecision(4)} … {preview.frame.intensityMax.toPrecision(4)}</span>
      </div>
      {preview.warnings.map(warning => (
        <small key={warning} style={{ color: 'var(--color-warning, #a66b00)' }}>{warning}</small>
      ))}
    </section>
  )
}

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
    { name: 'tool.call.toolview', key: 'neuro_preview' },
    NeuroPreviewRow,
  ))
}
