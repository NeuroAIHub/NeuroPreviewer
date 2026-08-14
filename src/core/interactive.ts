import { randomUUID } from 'node:crypto'
import { inspectNifti, inspectNiftiTimeSeries, inspectNiftiVoxel, NeuroPreviewError } from './nifti.js'
import type {
  BinarySource,
  InteractiveDataset,
  InteractivePreviewView,
  InteractiveViewRequest,
  NiftiMetadata,
  SliceAxis,
  VoxelCursor,
} from './types.js'

export interface InteractivePreviewOptions {
  readonly maxSlicePixels?: number
  readonly maxOpenDatasets?: number
  readonly maxTimeSeriesPoints?: number
  readonly createId?: () => string
}

interface OpenDatasetRecord {
  readonly datasetId: string
  readonly path: string
  readonly bytes: Uint8Array
  readonly metadata: NiftiMetadata
  readonly warnings: readonly string[]
}

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

/**
 * Host-side interactive preview Module. It owns bounded dataset caching and
 * returns one internally consistent MPR/time-series snapshot per view request.
 */
export class InteractiveNeuroPreview {
  readonly #datasets = new Map<string, OpenDatasetRecord>()
  readonly #maxSlicePixels: number
  readonly #maxOpenDatasets: number
  readonly #maxTimeSeriesPoints: number
  readonly #createId: () => string

  constructor(
    readonly source: BinarySource,
    options: InteractivePreviewOptions = {},
  ) {
    this.#maxSlicePixels = positiveInteger(options.maxSlicePixels ?? 4_194_304, 'maxSlicePixels')
    this.#maxOpenDatasets = positiveInteger(options.maxOpenDatasets ?? 2, 'maxOpenDatasets')
    this.#maxTimeSeriesPoints = positiveInteger(options.maxTimeSeriesPoints ?? 1024, 'maxTimeSeriesPoints', 2)
    this.#createId = options.createId ?? randomUUID
  }

  async open(path: string, signal?: AbortSignal): Promise<InteractiveDataset> {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')
    if (path.trim().length === 0) throw new NeuroPreviewError('path must be a non-empty string', 'INVALID_REQUEST')
    const bytes = await this.source.read(path, signal)
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')

    const initial = inspectNifti(bytes, { path }, this.#maxSlicePixels)
    const datasetId = this.#createId()
    if (datasetId.length === 0 || this.#datasets.has(datasetId)) {
      throw new Error('interactive dataset id factory returned an invalid or duplicate id')
    }
    const record: OpenDatasetRecord = {
      datasetId,
      path,
      bytes,
      metadata: initial.metadata,
      warnings: initial.warnings,
    }
    this.#datasets.set(datasetId, record)
    this.#evictOverflow()
    return {
      datasetId,
      path,
      metadata: record.metadata,
      warnings: record.warnings,
      view: this.#render(record, middleCursor(record.metadata)),
    }
  }

  view(request: InteractiveViewRequest): InteractivePreviewView {
    const record = this.#datasets.get(request.datasetId)
    if (record === undefined) {
      throw new NeuroPreviewError(`Interactive dataset is not open: ${request.datasetId}`, 'INVALID_REQUEST')
    }
    this.#datasets.delete(record.datasetId)
    this.#datasets.set(record.datasetId, record)
    return this.#render(record, request)
  }

  close(datasetId: string): boolean {
    return this.#datasets.delete(datasetId)
  }

  get openDatasetCount(): number {
    return this.#datasets.size
  }

  #render(record: OpenDatasetRecord, cursor: VoxelCursor): InteractivePreviewView {
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
