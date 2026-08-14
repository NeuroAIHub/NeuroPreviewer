import { mkdir, readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { inspectNifti } from '../lib/index.js'

const outputDir = new URL('./assets/', import.meta.url)
await mkdir(outputDir, { recursive: true })

const fixtures = [
  {
    source: '../test-data/real/openneuro-ds000005/sub-01/anat/sub-01_T1w.nii',
    frames: [
      ['t1-axial', 'axial', 96, 0],
      ['t1-coronal', 'coronal', 96, 0],
      ['t1-sagittal', 'sagittal', 80, 0],
    ],
  },
  {
    source: '../test-data/real/openneuro-ds000005/sub-01/func/sub-01_task-mixedgamblestask_run-01_bold.nii',
    frames: [
      ['fmri-t000', 'axial', 17, 0],
      ['fmri-t060', 'axial', 17, 60],
      ['fmri-t120', 'axial', 17, 120],
      ['fmri-t180', 'axial', 17, 180],
      ['fmri-t239', 'axial', 17, 239],
      ['fmri-coronal', 'coronal', 32, 120],
      ['fmri-sagittal', 'sagittal', 32, 120],
    ],
  },
]

for (const fixture of fixtures) {
  const sourceUrl = new URL(fixture.source, import.meta.url)
  const bytes = new Uint8Array(await readFile(sourceUrl))
  for (const [name, axis, index, volume] of fixture.frames) {
    const preview = inspectNifti(bytes, {
      path: sourceUrl.pathname,
      axis,
      index,
      volume,
    })
    const header = Buffer.from(`P5\n${preview.frame.width} ${preview.frame.height}\n255\n`, 'ascii')
    const pgm = Buffer.concat([header, Buffer.from(preview.frame.pixels)])
    const target = new URL(`${name}.png`, outputDir)
    const result = spawnSync('convert', ['pgm:-', target.pathname], { input: pgm })
    if (result.status !== 0) {
      throw new Error(`convert failed for ${name}: ${result.stderr.toString()}`)
    }
  }
}
