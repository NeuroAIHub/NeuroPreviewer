import { parseMatV5 } from './mat-v5.js'
import { NeuroPreviewError } from './nifti.js'
import { boundedSignalView, finiteRange, sampledIndices, type SignalAdapter, type SignalViewOptions } from './signal-adapter.js'

function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new NeuroPreviewError(`EEGLAB ${name} is missing or invalid`, 'INVALID_FORMAT')
  return value as Record<string, unknown>
}
function positive(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new NeuroPreviewError(`EEGLAB ${name} is missing or invalid`, 'INVALID_FORMAT')
  return value
}

export interface EeglabHeader {
  readonly dataFile?: string
  open(data?: Uint8Array): SignalAdapter
}

export function parseEeglabHeader(bytes: Uint8Array): EeglabHeader {
  const eeg = record(parseMatV5(bytes).EEG, 'EEG struct')
  const channelCount = positive(eeg.nbchan, 'nbchan')
  const points = positive(eeg.pnts, 'pnts')
  const trials = positive(eeg.trials, 'trials')
  const sampleRate = positive(eeg.srate, 'srate')
  const rawData = eeg.data
  const dataFile = typeof rawData === 'string' ? rawData : undefined
  const channelRecords = Array.isArray(eeg.chanlocs) ? eeg.chanlocs : []
  const channels = Array.from({ length: channelCount }, (_, index) => {
    const channel = channelRecords[index]
    const label = typeof channel === 'object' && channel !== null && typeof (channel as Record<string, unknown>).labels === 'string' ? (channel as Record<string, unknown>).labels as string : `Channel ${index + 1}`
    return { label, unit: 'µV', sampleRate }
  })
  return {
    ...(dataFile === undefined ? {} : { dataFile }),
    open(external?: Uint8Array) {
      if (dataFile === undefined) throw new NeuroPreviewError('Embedded EEGLAB data arrays are not supported yet', 'UNSUPPORTED_FORMAT')
      if (external === undefined) throw new NeuroPreviewError(`EEGLAB companion data file is required: ${dataFile}`, 'TRUNCATED_FILE')
      const sampleCount = points * trials
      const expectedBytes = sampleCount * channelCount * 4
      if (external.byteLength < expectedBytes) throw new NeuroPreviewError('EEGLAB .fdt signal data is truncated', 'TRUNCATED_FILE')
      const data = new DataView(external.buffer, external.byteOffset, external.byteLength)
      return {
        metadata: { format: 'eeglab', channelCount, sampleRate, sampleCount, durationSeconds: sampleCount / sampleRate, channels, recording: typeof eeg.setname === 'string' ? eeg.setname : undefined },
        warnings: trials > 1 ? [`${trials} EEGLAB epochs are shown as one continuous timeline.`] : [],
        view(rawOptions: SignalViewOptions) {
          const options = boundedSignalView(rawOptions, this.metadata)
          const indices = sampledIndices(options.startSample, options.windowSamples, options.maxPoints)
          const traces = Array.from({ length: options.channelCount }, (_, relative) => {
            const channel = options.channelStart + relative
            const values = indices.map(index => data.getFloat32((index * channelCount + channel) * 4, true))
            return { channel, ...channels[channel]!, ...finiteRange(values), samples: values }
          })
          return { kind: 'signals', startSample: options.startSample, windowSamples: options.windowSamples, timeStart: options.startSample / sampleRate, timeEnd: (options.startSample + options.windowSamples) / sampleRate, traces }
        },
      }
    },
  }
}
