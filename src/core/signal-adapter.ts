import type { SignalMetadata, SignalPreviewView } from './types.js'

export interface SignalViewOptions {
  readonly startSample: number
  readonly windowSamples: number
  readonly channelStart: number
  readonly channelCount: number
  readonly maxPoints: number
}

/** Internal seam shared by signal-file adapters and the interactive host. */
export interface SignalAdapter {
  readonly metadata: SignalMetadata
  readonly warnings: readonly string[]
  view(options: SignalViewOptions): SignalPreviewView
}

export function boundedSignalView(
  options: SignalViewOptions,
  metadata: SignalMetadata,
): Required<SignalViewOptions> {
  const startSample = Math.max(0, Math.min(metadata.sampleCount - 1, Math.floor(options.startSample)))
  const windowSamples = Math.max(1, Math.min(metadata.sampleCount - startSample, Math.floor(options.windowSamples)))
  const channelStart = Math.max(0, Math.min(metadata.channelCount - 1, Math.floor(options.channelStart)))
  const channelCount = Math.max(1, Math.min(metadata.channelCount - channelStart, Math.floor(options.channelCount)))
  const maxPoints = Math.max(2, Math.floor(options.maxPoints))
  return { startSample, windowSamples, channelStart, channelCount, maxPoints }
}

export function sampledIndices(start: number, length: number, maxPoints: number): number[] {
  const count = Math.min(length, maxPoints)
  if (count <= 1) return [start]
  return Array.from({ length: count }, (_, index) => start + Math.round(index * (length - 1) / (count - 1)))
}

export function finiteRange(values: readonly number[]): { min: number, max: number } {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const value of values) {
    if (!Number.isFinite(value)) continue
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  return Number.isFinite(min) ? { min, max } : { min: 0, max: 0 }
}
