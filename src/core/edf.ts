import { NeuroPreviewError } from './nifti.js'
import { boundedSignalView, finiteRange, sampledIndices, type SignalAdapter, type SignalViewOptions } from './signal-adapter.js'

const decoder = new TextDecoder('latin1')

function text(bytes: Uint8Array, offset: number, length: number): string {
  return decoder.decode(bytes.subarray(offset, offset + length)).trim()
}

function numberField(bytes: Uint8Array, offset: number, length: number, name: string): number {
  const value = Number(text(bytes, offset, length))
  if (!Number.isFinite(value)) throw new NeuroPreviewError(`Invalid EDF ${name}`, 'INVALID_FORMAT')
  return value
}

function fields(bytes: Uint8Array, offset: number, width: number, count: number): string[] {
  return Array.from({ length: count }, (_, index) => text(bytes, offset + index * width, width))
}

export function openEdf(bytes: Uint8Array): SignalAdapter {
  if (bytes.byteLength < 256) throw new NeuroPreviewError('EDF file is shorter than its fixed header', 'TRUNCATED_FILE')
  if (text(bytes, 0, 8) !== '0') throw new NeuroPreviewError('File is not EDF/EDF+', 'INVALID_FORMAT')
  const patient = text(bytes, 8, 80)
  const recording = text(bytes, 88, 80)
  const headerBytes = numberField(bytes, 184, 8, 'header length')
  const reserved = text(bytes, 192, 44)
  const recordCount = numberField(bytes, 236, 8, 'record count')
  const recordDuration = numberField(bytes, 244, 8, 'record duration')
  const channelCount = numberField(bytes, 252, 4, 'channel count')
  if (!Number.isSafeInteger(headerBytes) || !Number.isSafeInteger(recordCount) || !Number.isSafeInteger(channelCount) || channelCount < 1 || recordCount < 0 || recordDuration <= 0) {
    throw new NeuroPreviewError('EDF header contains invalid dimensions', 'INVALID_FORMAT')
  }
  if (headerBytes !== 256 + channelCount * 256 || bytes.byteLength < headerBytes) {
    throw new NeuroPreviewError('EDF channel header is truncated or inconsistent', 'TRUNCATED_FILE')
  }
  let offset = 256
  const labels = fields(bytes, offset, 16, channelCount); offset += 16 * channelCount
  offset += 80 * channelCount
  const units = fields(bytes, offset, 8, channelCount); offset += 8 * channelCount
  const physicalMin = fields(bytes, offset, 8, channelCount).map(Number); offset += 8 * channelCount
  const physicalMax = fields(bytes, offset, 8, channelCount).map(Number); offset += 8 * channelCount
  const digitalMin = fields(bytes, offset, 8, channelCount).map(Number); offset += 8 * channelCount
  const digitalMax = fields(bytes, offset, 8, channelCount).map(Number); offset += 8 * channelCount
  offset += 80 * channelCount
  const samplesPerRecord = fields(bytes, offset, 8, channelCount).map(Number)
  const recordSamples = samplesPerRecord.reduce((sum, value) => sum + value, 0)
  if (samplesPerRecord.some(value => !Number.isSafeInteger(value) || value < 1)) throw new NeuroPreviewError('EDF samples per record are invalid', 'INVALID_FORMAT')
  const expectedBytes = headerBytes + recordCount * recordSamples * 2
  if (bytes.byteLength < expectedBytes) throw new NeuroPreviewError('EDF signal data is truncated', 'TRUNCATED_FILE')
  const annotation = labels.map(label => label.toLowerCase()).findIndex(label => label.includes('annotation'))
  const visible = labels.map((_, index) => index).filter(index => index !== annotation)
  if (visible.length === 0) throw new NeuroPreviewError('EDF file contains annotations but no numeric signal channels', 'UNSUPPORTED_FORMAT')
  const reference = visible[0] ?? 0
  const sampleRate = samplesPerRecord[reference]! / recordDuration
  const sampleCount = recordCount * samplesPerRecord[reference]!
  const channels = visible.map(index => ({ label: labels[index] || `Channel ${index + 1}`, unit: units[index] || '', sampleRate: samplesPerRecord[index]! / recordDuration }))
  const channelOffsets: number[] = []
  let withinRecord = 0
  for (const count of samplesPerRecord) { channelOffsets.push(withinRecord); withinRecord += count * 2 }

  function sample(channel: number, referenceSample: number): number {
    const source = visible[channel]!
    const sourceRate = samplesPerRecord[source]! / recordDuration
    const sourceSample = Math.min(recordCount * samplesPerRecord[source]! - 1, Math.floor(referenceSample * sourceRate / sampleRate))
    const record = Math.floor(sourceSample / samplesPerRecord[source]!)
    const inside = sourceSample % samplesPerRecord[source]!
    const byteOffset = headerBytes + record * recordSamples * 2 + channelOffsets[source]! + inside * 2
    const raw = new DataView(bytes.buffer, bytes.byteOffset + byteOffset, 2).getInt16(0, true)
    const dMin = digitalMin[source]!, dMax = digitalMax[source]!, pMin = physicalMin[source]!, pMax = physicalMax[source]!
    return dMax === dMin ? raw : pMin + (raw - dMin) * (pMax - pMin) / (dMax - dMin)
  }

  return {
    metadata: {
      format: reserved.startsWith('EDF+') ? 'edf+' : 'edf', channelCount: channels.length,
      sampleRate, sampleCount, durationSeconds: sampleCount / sampleRate, channels, patient, recording,
    },
    warnings: annotation >= 0 ? ['EDF+ annotations are detected but not rendered yet.'] : [],
    view(rawOptions: SignalViewOptions) {
      const options = boundedSignalView(rawOptions, this.metadata)
      const indices = sampledIndices(options.startSample, options.windowSamples, options.maxPoints)
      const traces = Array.from({ length: options.channelCount }, (_, relative) => {
        const channel = options.channelStart + relative
        const values = indices.map(index => sample(channel, index))
        return { channel, ...channels[channel]!, ...finiteRange(values), samples: values }
      })
      return { kind: 'signals', startSample: options.startSample, windowSamples: options.windowSamples, timeStart: options.startSample / sampleRate, timeEnd: (options.startSample + options.windowSamples) / sampleRate, traces }
    },
  }
}
