import { access, open, readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspectNifti, NeuroPreviewError } from '../lib/index.js'

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

async function prefix(relative, length = 512) {
  const handle = await open(resolve(root, relative), 'r')
  try {
    const bytes = Buffer.alloc(length)
    const { bytesRead } = await handle.read(bytes, 0, length, 0)
    return bytes.subarray(0, bytesRead)
  } finally {
    await handle.close()
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const edfFiles = [
  'test-data/real/physionet-eegmmidb/S001R01.edf',
  'test-data/real/physionet-sleep-edfx/SC4001E0-PSG.edf',
  'test-data/real/physionet-sleep-edfx/SC4001EC-Hypnogram.edf',
]
for (const path of edfFiles) {
  const bytes = await prefix(path)
  assert(bytes.subarray(0, 8).toString('ascii') === '0       ', `${path} has an invalid EDF version field`)
  try {
    inspectNifti(bytes, { path })
    throw new Error(`${path} was incorrectly accepted as NIfTI`)
  } catch (error) {
    assert(error instanceof NeuroPreviewError, `${path} failed with an unexpected error`)
  }
}

const brainVisionHeaderPath = 'test-data/real/openneuro-ds007629/sub-10014/eeg/sub-10014_task-ReMind_run-1_eeg.vhdr'
const brainVisionHeader = await readFile(resolve(root, brainVisionHeaderPath), 'utf8')
const dataFile = /^DataFile=(.+)$/mu.exec(brainVisionHeader)?.[1]?.trim()
const markerFile = /^MarkerFile=(.+)$/mu.exec(brainVisionHeader)?.[1]?.trim()
assert(dataFile !== undefined, 'BrainVision header does not declare DataFile')
assert(markerFile !== undefined, 'BrainVision header does not declare MarkerFile')
await access(resolve(root, dirname(brainVisionHeaderPath), dataFile))
await access(resolve(root, dirname(brainVisionHeaderPath), markerFile))

const eeglabSet = await prefix('test-data/real/eeglab-sample/eeglab_data.set', 16)
assert(eeglabSet.toString('ascii').startsWith('MATLAB 5.0 MAT-f'), 'EEGLAB .set is not a MATLAB v5 file')
await access(resolve(root, 'test-data/real/eeglab-sample/eeglab_data.fdt'))

const hdf5Magic = '894844460d0a1a0a'
const nwbFiles = [
  'test-data/real/dandi-000006/sub-anm369962_ses-20170316.nwb',
  'test-data/real/dandi-000006/sub-anm369963_ses-20170228.nwb',
]
for (const path of nwbFiles) {
  const bytes = await prefix(path, 8)
  assert(bytes.toString('hex') === hdf5Magic, `${path} is not an HDF5/NWB file`)
}

console.log(JSON.stringify({
  unsupportedFixturesValidated: {
    edf: edfFiles.map(path => basename(path)),
    brainvision: [basename(brainVisionHeaderPath), dataFile, markerFile],
    eeglab: ['eeglab_data.set', 'eeglab_data.fdt'],
    nwb: nwbFiles.map(path => basename(path)),
  },
}, null, 2))
