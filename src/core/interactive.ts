import { randomUUID } from 'node:crypto'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { parseBrainVisionHeader } from './brainvision.js'
import { openEdf } from './edf.js'
import { parseEeglabHeader } from './eeglab.js'
import { openNwb } from './nwb.js'
import { inspectNifti, inspectNiftiTimeSeries, inspectNiftiVoxel, NeuroPreviewError } from './nifti.js'
import type { SignalAdapter } from './signal-adapter.js'
import type {
  AnyInteractiveDataset,
  AnyInteractivePreviewView,
  AnyInteractiveViewRequest,
  BinarySource,
  InteractivePreviewView,
  InteractiveViewRequest,
  NiftiMetadata,
  SliceAxis,
  SignalPreviewView,
  SignalViewRequest,
  VoxelCursor,
} from './types.js'

export interface InteractivePreviewOptions {
  readonly maxFileBytes?: number
  readonly maxSlicePixels?: number
  readonly maxOpenDatasets?: number
  readonly maxTimeSeriesPoints?: number
  readonly createId?: () => string
}

interface OpenVolumeRecord {
  readonly kind: 'volume'
  readonly datasetId: string
  readonly path: string
  readonly bytes: Uint8Array
  readonly metadata: NiftiMetadata
  readonly warnings: readonly string[]
}

interface OpenSignalRecord {
  readonly kind: 'signals'
  readonly datasetId: string
  readonly path: string
  readonly adapter: SignalAdapter
}

type OpenDatasetRecord = OpenVolumeRecord | OpenSignalRecord

function positiveInteger(value: number, name: string, minimum = 1): number {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${name} must be an integer of at least ${minimum}`)
  }
  return value
}

function middleCursor(metadata: NiftiMetadata): VoxelCursor {
  const [x = 1, y = 1, z = 1] = metadata.dimensions
  return {
    x: Math.floor(x / 2),
    y: Math.floor(y / 2),
    z: Math.floor(z / 2),
    volume: 0,
  }
}

function companionPath(headerPath: string, reference: string): string {
  const base = dirname(headerPath)
  const target = resolve(base, reference)
  const inside = relative(base, target)
  if (inside.startsWith('..') || isAbsolute(inside)) throw new NeuroPreviewError('Companion data path escapes the header directory', 'INVALID_REQUEST')
  return target
}

/**
 * Host-side interactive preview Module. It owns bounded dataset caching and
 * returns one internally consistent MPR/time-series snapshot per view request.
 */
export class InteractiveNeuroPreview {
  readonly #datasets = new Map<string, OpenDatasetRecord>()
  readonly #maxSlicePixels: number
  readonly #maxFileBytes: number
  readonly #maxOpenDatasets: number
  readonly #maxTimeSeriesPoints: number
  readonly #createId: () => string

  constructor(
    readonly source: BinarySource,
    options: InteractivePreviewOptions = {},
  ) {
    this.#maxSlicePixels = positiveInteger(options.maxSlicePixels ?? 4_194_304, 'maxSlicePixels')
    this.#maxFileBytes = positiveInteger(options.maxFileBytes ?? 256 * 1024 * 1024, 'maxFileBytes')
    this.#maxOpenDatasets = positiveInteger(options.maxOpenDatasets ?? 2, 'maxOpenDatasets')
    this.#maxTimeSeriesPoints = positiveInteger(options.maxTimeSeriesPoints ?? 1024, 'maxTimeSeriesPoints', 2)
    this.#createId = options.createId ?? randomUUID
  }

  async open(path: string, signal?: AbortSignal): Promise<AnyInteractiveDataset> {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')
    if (path.trim().length === 0) throw new NeuroPreviewError('path must be a non-empty string', 'INVALID_REQUEST')
    const fileBytes = await this.source.read(path, signal)
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')
    const datasetId = this.#createId()
    if (datasetId.length === 0 || this.#datasets.has(datasetId)) {
      throw new Error('interactive dataset id factory returned an invalid or duplicate id')
    }
    const lower = path.toLowerCase()
    if (lower.endsWith('.edf')) {
      const adapter = openEdf(fileBytes)
      const record: OpenSignalRecord = { kind: 'signals', datasetId, path, adapter }
      this.#datasets.set(datasetId, record)
      this.#evictOverflow()
      const windowSamples = Math.min(adapter.metadata.sampleCount, Math.max(1, Math.round(adapter.metadata.sampleRate * 10)))
      return { kind: 'signals', datasetId, path, metadata: adapter.metadata, warnings: adapter.warnings, view: adapter.view({ startSample: 0, windowSamples, channelStart: 0, channelCount: Math.min(8, adapter.metadata.channelCount), maxPoints: this.#maxTimeSeriesPoints }) }
    }
    if (lower.endsWith('.vhdr')) {
      const header = parseBrainVisionHeader(fileBytes)
      const data = await this.source.read(companionPath(path, header.dataFile), signal)
      const adapter = header.open(data)
      const record: OpenSignalRecord = { kind: 'signals', datasetId, path, adapter }
      this.#datasets.set(datasetId, record)
      this.#evictOverflow()
      const windowSamples = Math.min(adapter.metadata.sampleCount, Math.max(1, Math.round(adapter.metadata.sampleRate * 10)))
      return { kind: 'signals', datasetId, path, metadata: adapter.metadata, warnings: adapter.warnings, view: adapter.view({ startSample: 0, windowSamples, channelStart: 0, channelCount: Math.min(8, adapter.metadata.channelCount), maxPoints: this.#maxTimeSeriesPoints }) }
    }
    if (lower.endsWith('.set')) {
      const header = parseEeglabHeader(fileBytes)
      const data = header.dataFile === undefined ? undefined : await this.source.read(companionPath(path, header.dataFile), signal)
      const adapter = header.open(data)
      const record: OpenSignalRecord = { kind: 'signals', datasetId, path, adapter }
      this.#datasets.set(datasetId, record)
      this.#evictOverflow()
      const windowSamples = Math.min(adapter.metadata.sampleCount, Math.max(1, Math.round(adapter.metadata.sampleRate * 10)))
      return { kind: 'signals', datasetId, path, metadata: adapter.metadata, warnings: adapter.warnings, view: adapter.view({ startSample: 0, windowSamples, channelStart: 0, channelCount: Math.min(8, adapter.metadata.channelCount), maxPoints: this.#maxTimeSeriesPoints }) }
    }
    if (lower.endsWith('.nwb')) {
      const adapter = openNwb(fileBytes)
      const record: OpenSignalRecord = { kind: 'signals', datasetId, path, adapter }
      this.#datasets.set(datasetId, record)
      this.#evictOverflow()
      const windowSamples = Math.min(adapter.metadata.sampleCount, Math.max(1, Math.round(adapter.metadata.sampleRate * 10)))
      return { kind: 'signals', datasetId, path, metadata: adapter.metadata, warnings: adapter.warnings, view: adapter.view({ startSample: 0, windowSamples, channelStart: 0, channelCount: Math.min(8, adapter.metadata.channelCount), maxPoints: this.#maxTimeSeriesPoints }) }
    }
    const bytes = lower.endsWith('.nii.gz') ? new Uint8Array(gunzipSync(fileBytes, { maxOutputLength: this.#maxFileBytes })) : fileBytes
    const initial = inspectNifti(bytes, { path }, this.#maxSlicePixels)
    const record: OpenVolumeRecord = {
      kind: 'volume',
      datasetId,
      path,
      bytes,
      metadata: initial.metadata,
      warnings: initial.warnings,
    }
    this.#datasets.set(datasetId, record)
    this.#evictOverflow()
    return {
      kind: 'volume',
      datasetId,
      path,
      metadata: record.metadata,
      warnings: record.warnings,
      view: this.#render(record, middleCursor(record.metadata)),
    }
  }

  view(request: InteractiveViewRequest): InteractivePreviewView
  view(request: SignalViewRequest): SignalPreviewView
  view(request: AnyInteractiveViewRequest): AnyInteractivePreviewView
  view(request: AnyInteractiveViewRequest): AnyInteractivePreviewView {
    const record = this.#datasets.get(request.datasetId)
    if (record === undefined) {
      throw new NeuroPreviewError(`Interactive dataset is not open: ${request.datasetId}`, 'INVALID_REQUEST')
    }
    this.#datasets.delete(record.datasetId)
    this.#datasets.set(record.datasetId, record)
    if (record.kind === 'signals') {
      if (!('startSample' in request)) throw new NeuroPreviewError('Signal preview requires a signal window request', 'INVALID_REQUEST')
      return record.adapter.view({ ...request, maxPoints: this.#maxTimeSeriesPoints })
    }
    if (!('x' in request)) throw new NeuroPreviewError('Volume preview requires a voxel cursor request', 'INVALID_REQUEST')
    return this.#render(record, request)
  }

  close(datasetId: string): boolean {
    return this.#datasets.delete(datasetId)
  }

  get openDatasetCount(): number {
    return this.#datasets.size
  }

  #render(record: OpenVolumeRecord, cursor: VoxelCursor): InteractivePreviewView {
    const frame = (axis: SliceAxis, index: number) => inspectNifti(record.bytes, {
      path: record.path,
      axis,
      index,
      volume: cursor.volume,
    }, this.#maxSlicePixels).frame
    const frames = {
      axial: frame('axial', cursor.z),
      coronal: frame('coronal', cursor.y),
      sagittal: frame('sagittal', cursor.x),
    }

    const timeSeries = inspectNiftiTimeSeries(record.bytes, cursor, this.#maxTimeSeriesPoints)
    const seriesOffset = timeSeries.indices.indexOf(cursor.volume)
    const cursorValue = seriesOffset >= 0
      ? timeSeries.values[seriesOffset] ?? 0
      : inspectNiftiVoxel(record.bytes, cursor)
    const { x, y, z, volume } = cursor

    return {
      cursor: { x, y, z, volume },
      cursorValue,
      frames,
      timeSeries,
    }
  }

  #evictOverflow(): void {
    while (this.#datasets.size > this.#maxOpenDatasets) {
      const oldest = this.#datasets.keys().next().value as string | undefined
      if (oldest === undefined) return
      this.#datasets.delete(oldest)
    }
  }
}
