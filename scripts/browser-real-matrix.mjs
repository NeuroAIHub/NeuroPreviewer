import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const baseURL = process.argv[2] ?? 'http://127.0.0.1:3080'
const root = resolve(import.meta.dirname, '..')
const cases = [
  ['design-demos/verify-dsh-integration.cjs', `${root}/test-data/real/openneuro-ds000005/sub-01/func/sub-01_task-mixedgamblestask_run-01_bold.nii.gz`, 'design-demos/screenshots/dsh-nifti-mpr.png', 'design-demos/screenshots/dsh-file-picker.png'],
  ['design-demos/verify-signal-integration.cjs', `${root}/test-data/real/physionet-eegmmidb/S001R01.edf`, 'EDF+', 'design-demos/screenshots/dsh-edf-workbench.png'],
  ['design-demos/verify-signal-integration.cjs', `${root}/test-data/real/openneuro-ds007629/sub-10014/eeg/sub-10014_task-ReMind_run-1_eeg.vhdr`, 'BRAINVISION', 'design-demos/screenshots/dsh-brainvision-workbench.png'],
  ['design-demos/verify-signal-integration.cjs', `${root}/test-data/real/eeglab-sample/eeglab_data.set`, 'EEGLAB', 'design-demos/screenshots/dsh-eeglab-workbench.png'],
  ['design-demos/verify-signal-integration.cjs', `${root}/test-data/real/dandi-000006/sub-anm369962_ses-20170316.nwb`, 'NWB', 'design-demos/screenshots/dsh-nwb-workbench.png'],
]

for (const [script, ...args] of cases) {
  const result = spawnSync(process.execPath, [script, baseURL, ...args], { cwd: root, encoding: 'utf8', stdio: 'pipe' })
  process.stdout.write(result.stdout)
  process.stderr.write(result.stderr)
  if (result.status !== 0) process.exit(result.status ?? 1)
}
process.stdout.write(`PASS real browser matrix (${cases.length} datasets) at ${baseURL}\n`)
