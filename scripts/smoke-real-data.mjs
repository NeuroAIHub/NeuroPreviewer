import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspectNifti, openEdf, openNwb, parseBrainVisionHeader, parseEeglabHeader } from '../lib/index.js'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const images = [
  {
    path: 'test-data/real/openneuro-ds000005/sub-01/anat/sub-01_T1w.nii',
    axis: 'axial',
    volume: 0,
  },
  {
    path: 'test-data/real/openneuro-ds000005/sub-01/func/sub-01_task-mixedgamblestask_run-01_bold.nii',
    axis: 'coronal',
    volume: 1,
  },
]

for (const image of images) {
  const absolute = resolve(root, image.path)
  let bytes
  try {
    bytes = await readFile(absolute)
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Missing ${image.path}; run npm run data:download first.`)
    }
    throw error
  }
  const preview = inspectNifti(bytes, {
    path: absolute,
    axis: image.axis,
    volume: image.volume,
  })
  console.log(JSON.stringify({
    path: image.path,
    format: preview.format,
    dimensions: preview.metadata.dimensions,
    datatype: preview.metadata.datatype,
    frame: {
      axis: preview.frame.axis,
      index: preview.frame.index,
      volume: preview.frame.volume,
      width: preview.frame.width,
      height: preview.frame.height,
      intensityMin: preview.frame.intensityMin,
      intensityMax: preview.frame.intensityMax,
    },
  }, null, 2))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const edfFiles = [
  'test-data/real/physionet-eegmmidb/S001R01.edf',
  'test-data/real/physionet-sleep-edfx/SC4001E0-PSG.edf',
]
for (const path of edfFiles) {
  const preview = openEdf(new Uint8Array(await readFile(resolve(root, path))))
  const view = preview.view({ startSample: 0, windowSamples: Math.min(preview.metadata.sampleCount, Math.round(preview.metadata.sampleRate * 10)), channelStart: 0, channelCount: Math.min(8, preview.metadata.channelCount), maxPoints: 1024 })
  assert(view.traces.length > 0 && view.traces[0].samples.length > 0, `${path} produced no EDF traces`)
  console.log(JSON.stringify({ path, format: preview.metadata.format, channels: preview.metadata.channelCount, sampleRate: preview.metadata.sampleRate, durationSeconds: preview.metadata.durationSeconds, previewPoints: view.traces[0].samples.length }, null, 2))
}

const brainVisionHeaderPath = 'test-data/real/openneuro-ds007629/sub-10014/eeg/sub-10014_task-ReMind_run-1_eeg.vhdr'
const brainVisionHeader = parseBrainVisionHeader(new Uint8Array(await readFile(resolve(root, brainVisionHeaderPath))))
const brainVision = brainVisionHeader.open(new Uint8Array(await readFile(resolve(root, dirname(brainVisionHeaderPath), brainVisionHeader.dataFile))))
const brainVisionView = brainVision.view({ startSample: 0, windowSamples: Math.round(brainVision.metadata.sampleRate * 10), channelStart: 0, channelCount: 8, maxPoints: 1024 })
assert(brainVisionView.traces.length === 8, 'BrainVision did not produce eight traces')
console.log(JSON.stringify({ path: brainVisionHeaderPath, format: brainVision.metadata.format, channels: brainVision.metadata.channelCount, sampleRate: brainVision.metadata.sampleRate, durationSeconds: brainVision.metadata.durationSeconds }, null, 2))

const eeglabPath = 'test-data/real/eeglab-sample/eeglab_data.set'
const eeglabHeader = parseEeglabHeader(new Uint8Array(await readFile(resolve(root, eeglabPath))))
assert(eeglabHeader.dataFile !== undefined, 'EEGLAB header does not declare external data')
const eeglab = eeglabHeader.open(new Uint8Array(await readFile(resolve(root, dirname(eeglabPath), eeglabHeader.dataFile))))
const eeglabView = eeglab.view({ startSample: 0, windowSamples: Math.round(eeglab.metadata.sampleRate * 10), channelStart: 0, channelCount: 8, maxPoints: 1024 })
assert(eeglabView.traces.length === 8, 'EEGLAB did not produce eight traces')
console.log(JSON.stringify({ path: eeglabPath, format: eeglab.metadata.format, channels: eeglab.metadata.channelCount, sampleRate: eeglab.metadata.sampleRate, durationSeconds: eeglab.metadata.durationSeconds }, null, 2))

const nwbFiles = [
  'test-data/real/dandi-000006/sub-anm369962_ses-20170316.nwb',
  'test-data/real/dandi-000006/sub-anm369963_ses-20170228.nwb',
]
for (const path of nwbFiles) {
  const preview = openNwb(new Uint8Array(await readFile(resolve(root, path))))
  const view = preview.view({ startSample: 0, windowSamples: Math.min(preview.metadata.sampleCount, 100), channelStart: 0, channelCount: Math.min(8, preview.metadata.channelCount), maxPoints: 1024 })
  assert(view.traces.length > 0, `${path} produced no NWB unit traces`)
  console.log(JSON.stringify({ path, format: preview.metadata.format, units: preview.metadata.channelCount, durationSeconds: preview.metadata.durationSeconds }, null, 2))
}
