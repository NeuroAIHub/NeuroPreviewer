import { NeuroPreviewError } from './nifti.js'
import { boundedSignalView, finiteRange, sampledIndices, type SignalAdapter, type SignalViewOptions } from './signal-adapter.js'

const decoder = new TextDecoder()

function parseIni(input: string): Map<string, Map<string, string>> {
  const sections = new Map<string, Map<string, string>>()
  let current = new Map<string, string>()
  for (const raw of input.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim()
    if (line.length === 0 || line.startsWith(';')) continue
    const match = /^\[([^\]]+)\]$/.exec(line)
    if (match) { current = new Map(); sections.set(match[1]!.toLowerCase(), current); continue }
    const split = line.indexOf('=')
    if (split > 0) current.set(line.slice(0, split).trim().toLowerCase(), line.slice(split + 1).trim())
  }
  return sections
}

export interface BrainVisionHeader {
  readonly dataFile: string
  readonly markerFile?: string
  open(data: Uint8Array): SignalAdapter
}

export function parseBrainVisionHeader(bytes: Uint8Array): BrainVisionHeader {
  const source = decoder.decode(bytes)
  if (!source.startsWith('Brain Vision Data Exchange Header File')) throw new NeuroPreviewError('File is not a BrainVision header', 'INVALID_FORMAT')
  const ini = parseIni(source)
  const common = ini.get('common infos')
  const binary = ini.get('binary infos')
  const channelInfo = ini.get('channel infos')
  if (!common || !binary || !channelInfo) throw new NeuroPreviewError('BrainVision header is missing required sections', 'INVALID_FORMAT')
  const dataFile = common.get('datafile')
  const channelCount = Number(common.get('numberofchannels'))
  const interval = Number(common.get('samplinginterval'))
  const orientation = common.get('dataorientation')?.toUpperCase()
  const binaryFormat = binary.get('binaryformat')?.toUpperCase()
  if (!dataFile || !Number.isSafeInteger(channelCount) || channelCount < 1 || !(interval > 0)) throw new NeuroPreviewError('BrainVision common metadata is invalid', 'INVALID_FORMAT')
  if (orientation !== 'MULTIPLEXED') throw new NeuroPreviewError(`BrainVision orientation ${orientation ?? '(missing)'} is not supported yet`, 'UNSUPPORTED_FORMAT')
  const formats = {
    IEEE_FLOAT_32: { bytes: 4, read: (view: DataView, offset: number) => view.getFloat32(offset, true) },
    INT_16: { bytes: 2, read: (view: DataView, offset: number) => view.getInt16(offset, true) },
    UINT_16: { bytes: 2, read: (view: DataView, offset: number) => view.getUint16(offset, true) },
  } as const
  const format = formats[binaryFormat as keyof typeof formats]
  if (!format) throw new NeuroPreviewError(`BrainVision binary format ${binaryFormat ?? '(missing)'} is not supported`, 'UNSUPPORTED_FORMAT')
  const channels = Array.from({ length: channelCount }, (_, index) => {
    const parts = (channelInfo.get(`ch${index + 1}`) ?? '').split(',')
    return { label: (parts[0] || `Channel ${index + 1}`).replaceAll('\\1', ','), unit: parts[3] || 'µV', sampleRate: 1_000_000 / interval, resolution: Number(parts[2]) || 1 }
  })
  const markerFile = common.get('markerfile')
  return {
    dataFile,
    ...(markerFile === undefined ? {} : { markerFile }),
    open(data: Uint8Array) {
      const frameBytes = format.bytes * channelCount
      const sampleCount = Math.floor(data.byteLength / frameBytes)
      if (sampleCount < 1) throw new NeuroPreviewError('BrainVision signal data is empty or truncated', 'TRUNCATED_FILE')
      const sampleRate = 1_000_000 / interval
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
      return {
        metadata: { format: 'brainvision', channelCount, sampleRate, sampleCount, durationSeconds: sampleCount / sampleRate, channels },
        warnings: data.byteLength % frameBytes === 0 ? [] : ['Trailing bytes after the final complete BrainVision sample were ignored.'],
        view(rawOptions: SignalViewOptions) {
          const options = boundedSignalView(rawOptions, this.metadata)
          const indices = sampledIndices(options.startSample, options.windowSamples, options.maxPoints)
          const traces = Array.from({ length: options.channelCount }, (_, relative) => {
            const channel = options.channelStart + relative
            const values = indices.map(index => format.read(view, (index * channelCount + channel) * format.bytes) * channels[channel]!.resolution)
            const { resolution: _resolution, ...metadata } = channels[channel]!
            return { channel, ...metadata, ...finiteRange(values), samples: values }
          })
          return { kind: 'signals', startSample: options.startSample, windowSamples: options.windowSamples, timeStart: options.startSample / sampleRate, timeEnd: (options.startSample + options.windowSamples) / sampleRate, traces }
        },
      }
    },
  }
}
