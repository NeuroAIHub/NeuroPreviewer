import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { parseBrainVisionHeader } from '../src/core/brainvision.js'
import { openEdf } from '../src/core/edf.js'
import { InteractiveNeuroPreview } from '../src/core/interactive.js'
import type { BinarySource } from '../src/core/types.js'
import { niftiInt16Fixture } from './fixture.js'

const encoder = new TextEncoder()

function fixed(value: string | number, width: number): Uint8Array {
  return encoder.encode(String(value).padEnd(width).slice(0, width))
}

function syntheticEdf(samplesPerRecord = [4, 4]): Uint8Array {
  const channelCount = 2
  const chunks = [
    fixed('0', 8), fixed('patient', 80), fixed('recording', 80), fixed('01.01.24', 8), fixed('12.00.00', 8),
    fixed(256 + channelCount * 256, 8), fixed('EDF+C', 44), fixed(1, 8), fixed(1, 8), fixed(channelCount, 4),
    fixed('C3', 16), fixed('C4', 16), fixed('', 80), fixed('', 80), fixed('uV', 8), fixed('uV', 8),
    fixed(-100, 8), fixed(-100, 8), fixed(100, 8), fixed(100, 8), fixed(-32768, 8), fixed(-32768, 8), fixed(32767, 8), fixed(32767, 8),
    fixed('', 80), fixed('', 80), fixed(samplesPerRecord[0] ?? 4, 8), fixed(samplesPerRecord[1] ?? 4, 8), fixed('', 32), fixed('', 32),
  ]
  const header = new Uint8Array(256 + channelCount * 256)
  let offset = 0
  for (const chunk of chunks) { header.set(chunk, offset); offset += chunk.length }
  const first = Array.from({ length: samplesPerRecord[0] ?? 4 }, (_, index) => Math.round(-32768 + index * 65535 / Math.max(1, (samplesPerRecord[0] ?? 4) - 1)))
  const second = Array.from({ length: samplesPerRecord[1] ?? 4 }, (_, index) => Math.round(32767 - index * 65535 / Math.max(1, (samplesPerRecord[1] ?? 4) - 1)))
  const values = new Int16Array([...first, ...second])
  const bytes = new Uint8Array(header.length + values.byteLength)
  bytes.set(header)
  const view = new DataView(bytes.buffer)
  values.forEach((value, index) => view.setInt16(header.length + index * 2, value, true))
  return bytes
}

describe('signal format adapters', () => {
  it('parses EDF/EDF+ channel calibration and windows', () => {
    const adapter = openEdf(syntheticEdf())
    expect(adapter.metadata).toMatchObject({ format: 'edf+', channelCount: 2, sampleRate: 4, sampleCount: 4, durationSeconds: 1 })
    const view = adapter.view({ startSample: 0, windowSamples: 4, channelStart: 0, channelCount: 2, maxPoints: 8 })
    expect(view.traces[0]?.samples[0]).toBeCloseTo(-100)
    expect(view.traces[0]?.samples[3]).toBeCloseTo(100)
    expect(view.traces[1]?.samples[0]).toBeCloseTo(100)
  })

  it('aligns mixed-rate EDF channels to the reference timeline and clamps requests', () => {
    const adapter = openEdf(syntheticEdf([4, 2]))
    expect(adapter.metadata.channels.map(channel => channel.sampleRate)).toEqual([4, 2])
    const view = adapter.view({ startSample: -100, windowSamples: 99, channelStart: -2, channelCount: 99, maxPoints: 99 })
    expect(view).toMatchObject({ startSample: 0, windowSamples: 4, timeStart: 0, timeEnd: 1 })
    expect(view.traces).toHaveLength(2)
    expect(view.traces[1]?.samples).toHaveLength(4)
    expect(view.traces[1]?.samples[0]).toBeCloseTo(100)
    expect(view.traces[1]?.samples[3]).toBeCloseTo(-100)
  })

  it('rejects truncated and inconsistent EDF files', () => {
    expect(() => openEdf(syntheticEdf().subarray(0, 200))).toThrow(/fixed header/)
    expect(() => openEdf(syntheticEdf().subarray(0, -2))).toThrow(/truncated/)
    const inconsistent = syntheticEdf()
    inconsistent.set(fixed(999, 8), 184)
    expect(() => openEdf(inconsistent)).toThrow(/truncated or inconsistent/)
  })

  it('parses multiplexed BrainVision float32 data and channel resolution', () => {
    const header = parseBrainVisionHeader(encoder.encode(`Brain Vision Data Exchange Header File Version 1.0
[Common Infos]
DataFile=sample.eeg
DataFormat=BINARY
DataOrientation=MULTIPLEXED
NumberOfChannels=2
SamplingInterval=1000
[Binary Infos]
BinaryFormat=IEEE_FLOAT_32
[Channel Infos]
Ch1=Fz,,0.5,uV
Ch2=Cz,,2,uV
`))
    const raw = new Float32Array([2, 3, 4, 5])
    const adapter = header.open(new Uint8Array(raw.buffer))
    expect(header.dataFile).toBe('sample.eeg')
    expect(adapter.metadata).toMatchObject({ format: 'brainvision', channelCount: 2, sampleRate: 1000, sampleCount: 2 })
    const view = adapter.view({ startSample: 0, windowSamples: 2, channelStart: 0, channelCount: 2, maxPoints: 2 })
    expect(view.traces[0]?.samples).toEqual([1, 2])
    expect(view.traces[1]?.samples).toEqual([6, 10])
  })

  it('rejects unsupported BrainVision orientations and incomplete sample frames', () => {
    const vectorized = encoder.encode(`Brain Vision Data Exchange Header File Version 1.0
[Common Infos]
DataFile=sample.eeg
DataFormat=BINARY
DataOrientation=VECTORIZED
NumberOfChannels=1
SamplingInterval=1000
[Binary Infos]
BinaryFormat=INT_16
[Channel Infos]
Ch1=Cz,,1,uV
`)
    expect(() => parseBrainVisionHeader(vectorized)).toThrow(/VECTORIZED is not supported/)

    const multiplexed = encoder.encode(new TextDecoder().decode(vectorized).replace('VECTORIZED', 'MULTIPLEXED'))
    const adapter = parseBrainVisionHeader(multiplexed).open(new Uint8Array([1, 0, 255]))
    expect(adapter.metadata.sampleCount).toBe(1)
    expect(adapter.warnings).toEqual([expect.stringContaining('Trailing bytes')])
  })

  it('opens compressed NIfTI and resolves BrainVision companion data through one interface', async () => {
    const nii = niftiInt16Fixture({ dimensions: [4, 3, 2, 1] })
    const header = encoder.encode(`Brain Vision Data Exchange Header File Version 1.0
[Common Infos]
DataFile=scan.eeg
DataFormat=BINARY
DataOrientation=MULTIPLEXED
NumberOfChannels=1
SamplingInterval=1000
[Binary Infos]
BinaryFormat=INT_16
[Channel Infos]
Ch1=Cz,,1,uV
`)
    const signal = new Int16Array([1, 2, 3, 4])
    const files = new Map<string, Uint8Array>([
      ['/study/scan.nii.gz', new Uint8Array(gzipSync(nii))],
      ['/study/scan.vhdr', header],
      ['/study/scan.eeg', new Uint8Array(signal.buffer)],
    ])
    const source: BinarySource = { async read(path) { const value = files.get(path); if (!value) throw new Error(path); return value } }
    const preview = new InteractiveNeuroPreview(source, { createId: (() => { let id = 0; return () => `data-${++id}` })() })
    await expect(preview.open('/study/scan.nii.gz')).resolves.toMatchObject({ kind: 'volume', metadata: { format: 'nifti-1' } })
    await expect(preview.open('/study/scan.vhdr')).resolves.toMatchObject({ kind: 'signals', metadata: { format: 'brainvision', sampleCount: 4 } })
  })

  it('does not allow a linked signal file to escape its header directory', async () => {
    const header = encoder.encode(`Brain Vision Data Exchange Header File Version 1.0
[Common Infos]
DataFile=../secret.eeg
DataFormat=BINARY
DataOrientation=MULTIPLEXED
NumberOfChannels=1
SamplingInterval=1000
[Binary Infos]
BinaryFormat=INT_16
[Channel Infos]
Ch1=Cz,,1,uV
`)
    const source: BinarySource = { async read(path) { if (path === '/study/scan.vhdr') return header; throw new Error(`unexpected read: ${path}`) } }
    await expect(new InteractiveNeuroPreview(source).open('/study/scan.vhdr')).rejects.toThrow(/escapes the header directory/)
  })

  it('bounds decompressed NIfTI size to prevent gzip expansion beyond the host limit', async () => {
    const compressed = new Uint8Array(gzipSync(new Uint8Array(4096)))
    const source: BinarySource = { async read() { return compressed } }
    const preview = new InteractiveNeuroPreview(source, { maxFileBytes: 1024 })
    await expect(preview.open('/study/oversized.nii.gz')).rejects.toThrow()
  })
})
