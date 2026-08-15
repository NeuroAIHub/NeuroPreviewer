import { File } from 'jsfive'
import { NeuroPreviewError } from './nifti.js'
import { boundedSignalView, finiteRange, type SignalAdapter, type SignalViewOptions } from './signal-adapter.js'

function numbers(value: unknown, name: string): number[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'number' || !Number.isFinite(item))) throw new NeuroPreviewError(`NWB ${name} is missing or unsupported`, 'UNSUPPORTED_FORMAT')
  return value as number[]
}

function lowerBound(values: readonly number[], target: number): number {
  let low = 0, high = values.length
  while (low < high) { const middle = (low + high) >>> 1; if ((values[middle] ?? 0) < target) low = middle + 1; else high = middle }
  return low
}

/** Opens the common NWB Units table as per-unit spike-count timelines. */
export function openNwb(bytes: Uint8Array): SignalAdapter {
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  let file: File
  try { file = new File(buffer, 'dataset.nwb') } catch (error) { throw new NeuroPreviewError(`Cannot read NWB/HDF5 file: ${error instanceof Error ? error.message : String(error)}`, 'INVALID_FORMAT') }
  const spikeTimes = numbers(file.get('units/spike_times')?.value, 'units/spike_times')
  const spikeIndices = numbers(file.get('units/spike_times_index')?.value, 'units/spike_times_index')
  if (spikeIndices.length < 1) throw new NeuroPreviewError('NWB file has no units to preview', 'UNSUPPORTED_FORMAT')
  const unitSpikes = spikeIndices.map((end, index) => spikeTimes.slice(index === 0 ? 0 : spikeIndices[index - 1], end))
  const durationSeconds = Math.max(0.1, spikeTimes.at(-1) ?? 0.1)
  const sampleRate = 10
  const sampleCount = Math.ceil(durationSeconds * sampleRate)
  const identifierValue = file.get('identifier')?.value
  const identifier = Array.isArray(identifierValue) && typeof identifierValue[0] === 'string' ? identifierValue[0] : undefined
  const channels = unitSpikes.map((_, index) => ({ label: `Unit ${index + 1}`, unit: 'spikes/bin', sampleRate }))
  return {
    metadata: { format: 'nwb', channelCount: channels.length, sampleRate, sampleCount, durationSeconds, channels, ...(identifier === undefined ? {} : { recording: identifier }) },
    warnings: ['NWB preview currently renders the Units table as binned spike counts; other NWB acquisition/processing groups remain metadata-only.'],
    view(rawOptions: SignalViewOptions) {
      const options = boundedSignalView(rawOptions, this.metadata)
      const pointCount = Math.min(options.windowSamples, options.maxPoints)
      const traces = Array.from({ length: options.channelCount }, (_, relative) => {
        const channel = options.channelStart + relative
        const spikes = unitSpikes[channel]!
        const samples = Array.from({ length: pointCount }, (_, point) => {
          const startSample = options.startSample + point * options.windowSamples / pointCount
          const endSample = options.startSample + (point + 1) * options.windowSamples / pointCount
          return lowerBound(spikes, endSample / sampleRate) - lowerBound(spikes, startSample / sampleRate)
        })
        return { channel, ...channels[channel]!, ...finiteRange(samples), samples }
      })
      return { kind: 'signals', startSample: options.startSample, windowSamples: options.windowSamples, timeStart: options.startSample / sampleRate, timeEnd: (options.startSample + options.windowSamples) / sampleRate, traces }
    },
  }
}
