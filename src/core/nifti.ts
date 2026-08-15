import type {
  CorePreviewDocument,
  NiftiMetadata,
  PreviewRequest,
  SliceAxis,
  VoxelCursor,
  VoxelTimeSeries,
} from './types.js'

const NIFTI1_HEADER_BYTES = 348
const DEFAULT_VOX_OFFSET = 352

interface Datatype {
  readonly name: string
  readonly bytes: number
  read(view: DataView, offset: number, littleEndian: boolean): number
}

const DATATYPES: Readonly<Record<number, Datatype>> = {
  2: { name: 'uint8', bytes: 1, read: (view, offset) => view.getUint8(offset) },
  4: { name: 'int16', bytes: 2, read: (view, offset, le) => view.getInt16(offset, le) },
  8: { name: 'int32', bytes: 4, read: (view, offset, le) => view.getInt32(offset, le) },
  16: { name: 'float32', bytes: 4, read: (view, offset, le) => view.getFloat32(offset, le) },
  64: { name: 'float64', bytes: 8, read: (view, offset, le) => view.getFloat64(offset, le) },
  256: { name: 'int8', bytes: 1, read: (view, offset) => view.getInt8(offset) },
  512: { name: 'uint16', bytes: 2, read: (view, offset, le) => view.getUint16(offset, le) },
  768: { name: 'uint32', bytes: 4, read: (view, offset, le) => view.getUint32(offset, le) },
}

interface ParsedHeader {
  readonly metadata: NiftiMetadata
  readonly dims: readonly number[]
  readonly datatype: Datatype
  readonly voxOffset: number
}

export class NeuroPreviewError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'INVALID_FORMAT'
      | 'UNSUPPORTED_FORMAT'
      | 'TRUNCATED_FILE'
      | 'INVALID_REQUEST'
      | 'LIMIT_EXCEEDED',
  ) {
    super(message)
    this.name = 'NeuroPreviewError'
  }
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  const end = Math.min(bytes.byteLength, offset + length)
  let value = ''
  for (let i = offset; i < end; i += 1) {
    const byte = bytes[i] ?? 0
    if (byte === 0) break
    value += String.fromCharCode(byte)
  }
  return value.trim()
}

function checkedProduct(values: readonly number[], label: string): number {
  let product = 1
  for (const value of values) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new NeuroPreviewError(`${label} contains an invalid dimension`, 'INVALID_FORMAT')
    }
    product *= value
    if (!Number.isSafeInteger(product)) {
      throw new NeuroPreviewError(`${label} exceeds safe integer limits`, 'LIMIT_EXCEEDED')
    }
  }
  return product
}

function parseHeader(bytes: Uint8Array): ParsedHeader {
  if (bytes.byteLength < NIFTI1_HEADER_BYTES) {
    throw new NeuroPreviewError('NIfTI file is shorter than its 348-byte header', 'TRUNCATED_FILE')
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const littleSize = view.getInt32(0, true)
  const bigSize = view.getInt32(0, false)
  const littleEndian = littleSize === NIFTI1_HEADER_BYTES
    ? true
    : bigSize === NIFTI1_HEADER_BYTES
      ? false
      : undefined
  if (littleEndian === undefined) {
    throw new NeuroPreviewError('File is not a NIfTI-1 image (sizeof_hdr is not 348)', 'INVALID_FORMAT')
  }

  const magic = readAscii(bytes, 344, 4)
  if (magic === 'ni1') {
    throw new NeuroPreviewError('Two-file NIfTI (.hdr/.img) is not supported yet', 'UNSUPPORTED_FORMAT')
  }
  if (magic !== 'n+1') {
    throw new NeuroPreviewError('Only single-file NIfTI-1 images are supported', 'INVALID_FORMAT')
  }

  const rank = view.getInt16(40, littleEndian)
  if (!Number.isInteger(rank) || rank < 1 || rank > 7) {
    throw new NeuroPreviewError(`Invalid NIfTI dimension rank: ${rank}`, 'INVALID_FORMAT')
  }
  const dims: number[] = []
  for (let i = 0; i < rank; i += 1) dims.push(view.getInt16(42 + i * 2, littleEndian))
  checkedProduct(dims, 'NIfTI dimensions')

  const datatypeCode = view.getInt16(70, littleEndian)
  const datatype = DATATYPES[datatypeCode]
  if (datatype === undefined) {
    throw new NeuroPreviewError(`Unsupported NIfTI datatype code: ${datatypeCode}`, 'UNSUPPORTED_FORMAT')
  }
  const bitpix = view.getInt16(72, littleEndian)
  if (bitpix !== datatype.bytes * 8) {
    throw new NeuroPreviewError(
      `NIfTI bitpix ${bitpix} does not match datatype ${datatypeCode}`,
      'INVALID_FORMAT',
    )
  }

  const rawVoxOffset = view.getFloat32(108, littleEndian)
  const voxOffset = rawVoxOffset === 0 ? DEFAULT_VOX_OFFSET : rawVoxOffset
  if (!Number.isSafeInteger(voxOffset) || voxOffset < NIFTI1_HEADER_BYTES) {
    throw new NeuroPreviewError(`Invalid NIfTI vox_offset: ${rawVoxOffset}`, 'INVALID_FORMAT')
  }
  const rawSlope = view.getFloat32(112, littleEndian)
  const rawIntercept = view.getFloat32(116, littleEndian)
  const sclSlope = Number.isFinite(rawSlope) && rawSlope !== 0 ? rawSlope : 1
  const sclIntercept = Number.isFinite(rawIntercept) ? rawIntercept : 0
  const voxelSize: number[] = []
  for (let i = 0; i < rank; i += 1) voxelSize.push(Math.abs(view.getFloat32(80 + i * 4, littleEndian)))

  return {
    dims,
    datatype,
    voxOffset,
    metadata: {
      format: 'nifti-1',
      dimensions: dims,
      voxelSize,
      datatype: datatype.name,
      datatypeCode,
      bitpix,
      littleEndian,
      sclSlope,
      sclIntercept,
      qformCode: view.getInt16(252, littleEndian),
      sformCode: view.getInt16(254, littleEndian),
      description: readAscii(bytes, 148, 80),
    },
  }
}

function requestedInteger(value: number | undefined, fallback: number, name: string, upper: number): number {
  const result = value ?? fallback
  if (!Number.isSafeInteger(result) || result < 0 || result >= upper) {
    throw new NeuroPreviewError(`${name} must be an integer from 0 to ${upper - 1}`, 'INVALID_REQUEST')
  }
  return result
}

function readVoxel(
  bytes: Uint8Array,
  header: ParsedHeader,
  x: number,
  y: number,
  z: number,
  volume: number,
): number {
  const [xDim = 1, yDim = 1, zDim = 1] = header.dims
  const voxelIndex = (((volume * zDim + z) * yDim + y) * xDim + x)
  const byteOffset = header.voxOffset + voxelIndex * header.datatype.bytes
  if (!Number.isSafeInteger(byteOffset) || byteOffset + header.datatype.bytes > bytes.byteLength) {
    throw new NeuroPreviewError('NIfTI voxel data is truncated', 'TRUNCATED_FILE')
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const raw = header.datatype.read(view, byteOffset, header.metadata.littleEndian)
  return raw * header.metadata.sclSlope + header.metadata.sclIntercept
}

function sampleIndices(length: number, maxPoints: number): number[] {
  if (!Number.isSafeInteger(maxPoints) || maxPoints < 2) {
    throw new NeuroPreviewError('maxPoints must be an integer of at least 2', 'INVALID_REQUEST')
  }
  if (length <= maxPoints) return Array.from({ length }, (_, index) => index)
  return Array.from({ length: maxPoints }, (_, index) => Math.round(index * (length - 1) / (maxPoints - 1)))
}

export function inspectNiftiTimeSeries(
  bytes: Uint8Array,
  cursor: Omit<VoxelCursor, 'volume'>,
  maxPoints = 1024,
): VoxelTimeSeries {
  const header = parseHeader(bytes)
  const [xDim = 1, yDim = 1, zDim = 1, tDim = 1] = header.dims
  const x = requestedInteger(cursor.x, 0, 'x', xDim)
  const y = requestedInteger(cursor.y, 0, 'y', yDim)
  const z = requestedInteger(cursor.z, 0, 'z', zDim)
  const indices = sampleIndices(tDim, maxPoints)
  const values = indices.map(volume => readVoxel(bytes, header, x, y, z, volume))
  const finite = values.filter(Number.isFinite)
  return {
    indices,
    values,
    min: finite.length === 0 ? 0 : Math.min(...finite),
    max: finite.length === 0 ? 0 : Math.max(...finite),
  }
}

export function inspectNiftiVoxel(bytes: Uint8Array, cursor: VoxelCursor): number {
  const header = parseHeader(bytes)
  const [xDim = 1, yDim = 1, zDim = 1, tDim = 1] = header.dims
  const x = requestedInteger(cursor.x, 0, 'x', xDim)
  const y = requestedInteger(cursor.y, 0, 'y', yDim)
  const z = requestedInteger(cursor.z, 0, 'z', zDim)
  const volume = requestedInteger(cursor.volume, 0, 'volume', tDim)
  return readVoxel(bytes, header, x, y, z, volume)
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * fraction)))
  return sorted[index] ?? 0
}

function normalize(values: readonly number[]): {
  pixels: Uint8Array
  min: number
  max: number
  low: number
  high: number
} {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b)
  const min = finite[0] ?? 0
  const max = finite.at(-1) ?? 0
  let low = percentile(finite, 0.02)
  let high = percentile(finite, 0.98)
  if (!(high > low)) {
    low = min
    high = max > min ? max : min + 1
  }
  const scale = 255 / (high - low)
  const pixels = new Uint8Array(values.length)
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i]
    pixels[i] = value !== undefined && Number.isFinite(value)
      ? Math.round(Math.max(0, Math.min(255, (value - low) * scale)))
      : 0
  }
  return { pixels, min, max, low, high }
}

function geometry(axis: SliceAxis, dims: readonly number[]): {
  width: number
  height: number
  axisLength: number
} {
  const [x = 1, y = 1, z = 1] = dims
  switch (axis) {
    case 'axial': return { width: x, height: y, axisLength: z }
    case 'coronal': return { width: x, height: z, axisLength: y }
    case 'sagittal': return { width: y, height: z, axisLength: x }
  }
}

export function inspectNifti(
  bytes: Uint8Array,
  request: PreviewRequest,
  maxSlicePixels = 4_194_304,
): CorePreviewDocument {
  const header = parseHeader(bytes)
  const [, , , tDim = 1] = header.dims
  const axis = request.axis ?? 'axial'
  const shape = geometry(axis, header.dims)
  const pixelCount = checkedProduct([shape.width, shape.height], 'Slice dimensions')
  if (pixelCount > maxSlicePixels) {
    throw new NeuroPreviewError(
      `Slice has ${pixelCount} pixels, exceeding the configured limit ${maxSlicePixels}`,
      'LIMIT_EXCEEDED',
    )
  }
  const index = requestedInteger(request.index, Math.floor(shape.axisLength / 2), 'index', shape.axisLength)
  const volume = requestedInteger(request.volume, 0, 'volume', tDim)
  const values = new Array<number>(pixelCount)

  let cursor = 0
  for (let row = 0; row < shape.height; row += 1) {
    for (let column = 0; column < shape.width; column += 1) {
      const [x, y, z] = axis === 'axial'
        ? [column, row, index]
        : axis === 'coronal'
          ? [column, index, row]
          : [index, column, row]
      values[cursor] = readVoxel(bytes, header, x, y, z, volume)
      cursor += 1
    }
  }

  const normalized = normalize(values)
  const warnings = [
    'Anatomical reorientation is not implemented yet; the preview follows voxel storage order.',
  ]
  return {
    kind: 'neuro-preview',
    format: 'nifti-1',
    path: request.path,
    metadata: header.metadata,
    frame: {
      kind: 'image2d',
      axis,
      index,
      volume,
      width: shape.width,
      height: shape.height,
      pixels: normalized.pixels,
      intensityMin: normalized.min,
      intensityMax: normalized.max,
      windowLow: normalized.low,
      windowHigh: normalized.high,
    },
    warnings,
  }
}
