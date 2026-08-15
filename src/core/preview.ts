import { inspectNifti } from './nifti.js'
import type { BinarySource, CorePreviewDocument, PreviewRequest } from './types.js'

export interface NeuroPreviewOptions {
  readonly maxFileBytes?: number
  readonly maxSlicePixels?: number
}

/** Format-neutral preview Module. Format Adapters remain private to this boundary. */
export class NeuroPreview {
  readonly #maxSlicePixels: number
  readonly #maxFileBytes: number

  constructor(
    readonly source: BinarySource,
    options: NeuroPreviewOptions = {},
  ) {
    this.#maxSlicePixels = options.maxSlicePixels ?? 4_194_304
    this.#maxFileBytes = options.maxFileBytes ?? 256 * 1024 * 1024
  }

  async inspect(request: PreviewRequest, signal?: AbortSignal): Promise<CorePreviewDocument> {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')
    if (request.path.trim().length === 0) throw new Error('path must be a non-empty string')
    const fileBytes = await this.source.read(request.path, signal)
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')
    const bytes = request.path.toLowerCase().endsWith('.nii.gz') ? new Uint8Array(gunzipSync(fileBytes, { maxOutputLength: this.#maxFileBytes })) : fileBytes
    return inspectNifti(bytes, request, this.#maxSlicePixels)
  }
}
import { gunzipSync } from 'node:zlib'
