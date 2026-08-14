export const AXES = ['axial', 'coronal', 'sagittal'] as const

export type SliceAxis = typeof AXES[number]

export interface PreviewRequest {
  readonly path: string
  readonly axis?: SliceAxis
  readonly index?: number
  readonly volume?: number
}

export interface NiftiMetadata {
  readonly format: 'nifti-1'
  readonly dimensions: readonly number[]
  readonly voxelSize: readonly number[]
  readonly datatype: string
  readonly datatypeCode: number
  readonly bitpix: number
  readonly littleEndian: boolean
  readonly sclSlope: number
  readonly sclIntercept: number
  readonly qformCode: number
  readonly sformCode: number
  readonly description: string
}

export interface Image2DFrame {
  readonly kind: 'image2d'
  readonly axis: SliceAxis
  readonly index: number
  readonly volume: number
  readonly width: number
  readonly height: number
  readonly pixels: Uint8Array
  readonly intensityMin: number
  readonly intensityMax: number
  readonly windowLow: number
  readonly windowHigh: number
}

export interface CorePreviewDocument {
  readonly kind: 'neuro-preview'
  readonly format: 'nifti-1'
  readonly path: string
  readonly metadata: NiftiMetadata
  readonly frame: Image2DFrame
  readonly warnings: readonly string[]
}

export interface WireImage2DFrame extends Omit<Image2DFrame, 'pixels'> {
  readonly pixelsBase64: string
}

export interface PreviewDocument extends Omit<CorePreviewDocument, 'frame'> {
  readonly frame: WireImage2DFrame
}

export interface BinarySource {
  read(path: string, signal?: AbortSignal): Promise<Uint8Array>
}
