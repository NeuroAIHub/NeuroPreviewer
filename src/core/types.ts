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

export interface VoxelCursor {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly volume: number
}

export interface VoxelTimeSeries {
  readonly indices: readonly number[]
  readonly values: readonly number[]
  readonly min: number
  readonly max: number
}

export interface InteractivePreviewView {
  readonly cursor: VoxelCursor
  readonly cursorValue: number
  readonly frames: Readonly<Record<SliceAxis, Image2DFrame>>
  readonly timeSeries: VoxelTimeSeries
}

export interface WireInteractivePreviewView extends Omit<InteractivePreviewView, 'frames'> {
  readonly frames: Readonly<Record<SliceAxis, WireImage2DFrame>>
}

export interface InteractiveDataset {
  readonly datasetId: string
  readonly path: string
  readonly metadata: NiftiMetadata
  readonly view: InteractivePreviewView
  readonly warnings: readonly string[]
}

export interface WireInteractiveDataset extends Omit<InteractiveDataset, 'view'> {
  readonly view: WireInteractivePreviewView
}

export interface InteractiveViewRequest extends VoxelCursor {
  readonly datasetId: string
}

export interface NeuroWorkspaceSummary {
  readonly id: string
  readonly title: string
  readonly path: string
}

export interface NeuroWorkspaceEntry {
  readonly name: string
  readonly path: string
  readonly type: 'directory' | 'file'
  readonly size?: number
}

export interface NeuroWorkspaceListing {
  readonly workspace: NeuroWorkspaceSummary
  readonly path: string
  readonly entries: readonly NeuroWorkspaceEntry[]
}

export interface BinarySource {
  read(path: string, signal?: AbortSignal): Promise<Uint8Array>
}
