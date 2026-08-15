import { inflateSync } from 'node:zlib'
import { NeuroPreviewError } from './nifti.js'

const MI_INT8 = 1, MI_UINT8 = 2, MI_INT16 = 3, MI_UINT16 = 4, MI_INT32 = 5, MI_UINT32 = 6
const MI_SINGLE = 7, MI_DOUBLE = 9, MI_INT64 = 12, MI_UINT64 = 13, MI_MATRIX = 14, MI_COMPRESSED = 15
const MX_CELL = 1, MX_STRUCT = 2, MX_CHAR = 4

interface Element { readonly type: number, readonly bytes: Uint8Array }

function product(values: readonly number[]): number { return values.reduce((total, value) => total * value, 1) }

class Reader {
  offset = 0
  constructor(readonly bytes: Uint8Array, readonly littleEndian: boolean) {}

  element(): Element {
    if (this.offset + 8 > this.bytes.byteLength) throw new NeuroPreviewError('MAT v5 data element is truncated', 'TRUNCATED_FILE')
    const view = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 8)
    const first = view.getUint32(0, this.littleEndian)
    const smallType = first & 0xffff
    const smallSize = first >>> 16
    if (smallSize > 0 && smallSize <= 4 && smallType <= MI_COMPRESSED) {
      const bytes = this.bytes.subarray(this.offset + 4, this.offset + 4 + smallSize)
      this.offset += 8
      return { type: smallType, bytes }
    }
    const type = first
    const size = view.getUint32(4, this.littleEndian)
    const start = this.offset + 8
    if (start + size > this.bytes.byteLength) throw new NeuroPreviewError('MAT v5 data element payload is truncated', 'TRUNCATED_FILE')
    const bytes = this.bytes.subarray(start, start + size)
    this.offset = start + Math.ceil(size / 8) * 8
    return { type, bytes }
  }
}

function numeric(element: Element, littleEndian: boolean): number[] {
  const view = new DataView(element.bytes.buffer, element.bytes.byteOffset, element.bytes.byteLength)
  const readers: Record<number, { size: number, get(offset: number): number }> = {
    [MI_INT8]: { size: 1, get: offset => view.getInt8(offset) }, [MI_UINT8]: { size: 1, get: offset => view.getUint8(offset) },
    [MI_INT16]: { size: 2, get: offset => view.getInt16(offset, littleEndian) }, [MI_UINT16]: { size: 2, get: offset => view.getUint16(offset, littleEndian) },
    [MI_INT32]: { size: 4, get: offset => view.getInt32(offset, littleEndian) }, [MI_UINT32]: { size: 4, get: offset => view.getUint32(offset, littleEndian) },
    [MI_SINGLE]: { size: 4, get: offset => view.getFloat32(offset, littleEndian) }, [MI_DOUBLE]: { size: 8, get: offset => view.getFloat64(offset, littleEndian) },
    [MI_INT64]: { size: 8, get: offset => Number(view.getBigInt64(offset, littleEndian)) }, [MI_UINT64]: { size: 8, get: offset => Number(view.getBigUint64(offset, littleEndian)) },
  }
  const reader = readers[element.type]
  if (!reader || element.bytes.byteLength % reader.size !== 0) throw new NeuroPreviewError(`Unsupported MAT v5 numeric type ${element.type}`, 'UNSUPPORTED_FORMAT')
  return Array.from({ length: element.bytes.byteLength / reader.size }, (_, index) => reader.get(index * reader.size))
}

function chars(element: Element, littleEndian: boolean): string {
  if (element.type === MI_INT8 || element.type === MI_UINT8) return new TextDecoder('latin1').decode(element.bytes).replace(/\0+$/, '')
  return String.fromCodePoint(...numeric(element, littleEndian)).replace(/\0+$/, '')
}

function parseMatrix(bytes: Uint8Array, littleEndian: boolean): { name: string, value: unknown } {
  const reader = new Reader(bytes, littleEndian)
  const flags = numeric(reader.element(), littleEndian)
  const dimensions = numeric(reader.element(), littleEndian)
  const name = chars(reader.element(), littleEndian)
  const matrixClass = (flags[0] ?? 0) & 0xff
  const elementCount = product(dimensions)
  if (matrixClass === MX_STRUCT) {
    const fieldNameLength = numeric(reader.element(), littleEndian)[0] ?? 0
    const rawNames = reader.element().bytes
    if (fieldNameLength < 1) throw new NeuroPreviewError('MAT v5 struct field width is invalid', 'INVALID_FORMAT')
    const fieldNames = Array.from({ length: rawNames.byteLength / fieldNameLength }, (_, index) => new TextDecoder('latin1').decode(rawNames.subarray(index * fieldNameLength, (index + 1) * fieldNameLength)).replace(/\0.*$/, ''))
    const records = Array.from({ length: elementCount }, () => ({} as Record<string, unknown>))
    for (const record of records) {
      for (const field of fieldNames) {
        const child = reader.element()
        record[field] = child.type === MI_MATRIX && child.bytes.byteLength > 0 ? parseMatrix(child.bytes, littleEndian).value : undefined
      }
    }
    return { name, value: records.length === 1 ? records[0] : records }
  }
  if (matrixClass === MX_CELL) {
    return { name, value: Array.from({ length: elementCount }, () => {
      const child = reader.element()
      return child.type === MI_MATRIX ? parseMatrix(child.bytes, littleEndian).value : undefined
    }) }
  }
  const data = reader.element()
  if (matrixClass === MX_CHAR) return { name, value: chars(data, littleEndian) }
  const values = numeric(data, littleEndian)
  return { name, value: values.length === 1 ? values[0] : values }
}

export function parseMatV5(bytes: Uint8Array): Record<string, unknown> {
  if (bytes.byteLength < 128 || !new TextDecoder('latin1').decode(bytes.subarray(0, 20)).includes('MATLAB')) throw new NeuroPreviewError('File is not a MATLAB v5 MAT-file', 'INVALID_FORMAT')
  const endian = new TextDecoder('latin1').decode(bytes.subarray(126, 128))
  const littleEndian = endian === 'IM'
  if (!littleEndian && endian !== 'MI') throw new NeuroPreviewError('MAT v5 endian marker is invalid', 'INVALID_FORMAT')
  const reader = new Reader(bytes.subarray(128), littleEndian)
  const result: Record<string, unknown> = {}
  while (reader.offset + 8 <= reader.bytes.byteLength) {
    const element = reader.element()
    if (element.type === MI_COMPRESSED) {
      const nested = new Reader(new Uint8Array(inflateSync(element.bytes)), littleEndian).element()
      if (nested.type === MI_MATRIX) { const parsed = parseMatrix(nested.bytes, littleEndian); result[parsed.name] = parsed.value }
    } else if (element.type === MI_MATRIX) {
      const parsed = parseMatrix(element.bytes, littleEndian); result[parsed.name] = parsed.value
    }
  }
  return result
}
