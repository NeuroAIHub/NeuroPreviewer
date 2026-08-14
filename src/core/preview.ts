import { inspectNifti } from './nifti.js'
import type { BinarySource, CorePreviewDocument, PreviewRequest } from './types.js'

export interface NeuroPreviewOptions {
  readonly maxSlicePixels?: number
}

/** Format-neutral preview Module. Format Adapters remain private to this boundary. */
export class NeuroPreview {
  readonly #maxSlicePixels: number

  constructor(
    readonly source: BinarySource,
    options: NeuroPreviewOptions = {},
  ) {
    this.#maxSlicePixels = options.maxSlicePixels ?? 4_194_304
  }

  async inspect(request: PreviewRequest, signal?: AbortSignal): Promise<CorePreviewDocument> {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')
    if (request.path.trim().length === 0) throw new Error('path must be a non-empty string')
    const bytes = await this.source.read(request.path, signal)
    if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')
    return inspectNifti(bytes, request, this.#maxSlicePixels)
  }
}
