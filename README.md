# NeuroPreviewer

[![npm version](https://img.shields.io/npm/v/%40brainpilot%2Fdsh-neuro-previewer)](https://www.npmjs.com/package/@brainpilot/dsh-neuro-previewer)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/DeepSeek%20Harness-plugin-5B5BD6)](https://github.com/deepseek-ai/deepseek-harness)

**English** | [简体中文](README.zh-CN.md)

> An interactive neuroscience data viewer built as a DeepSeek Harness plugin.

**NeuroPreviewer is a [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) plugin, not a standalone desktop viewer.** Open its MPR workbench directly from the DSH sidebar, or enter it from a `neuro_preview` tool result. The Host reads local data while the browser receives only bounded preview frames and a sampled time series.

`@brainpilot/dsh-neuro-previewer` · [GitHub](https://github.com/NeuroAIHub/NeuroPreviewer) · [MIT License](LICENSE)

![NeuroPreviewer interactive MPR workbench](https://raw.githubusercontent.com/NeuroAIHub/NeuroPreviewer/main/design-demos/screenshots/dsh-interactive-workbench.png)

> **Release status:** npm `0.1.0` is the stable static-preview release. The interactive workbench is currently `0.2.0-alpha.4` on `main` and must be installed from source. Both target DSH `0.1.0-rc.6`; DSH is still a developer preview and may make breaking changes.

## What it does

| Capability | Status | Details |
| --- | --- | --- |
| Direct DSH viewer entry | ✅ alpha | Sits below New Session and above Workspaces in the sidebar |
| Workspace file tree | ✅ alpha | Compact non-blocking popup; folders expand in place and preserve all ancestors |
| DSH theme integration | ✅ alpha | Uses DSH semantic colors, borders, typography, hover states, and shadows |
| Linked MPR views | ✅ alpha | Axial, coronal, and sagittal canvases share one voxel cursor |
| Direct spatial navigation | ✅ alpha | Click a plane or move the X/Y/Z sliders |
| 4D navigation | ✅ alpha | Scrub, step, or play fMRI volumes |
| Voxel time series | ✅ alpha | Plots the selected voxel across all volumes, with bounded sampling |
| Conversation entry | ✅ | `neuro_preview` returns a preview card with a button into the workbench |
| NIfTI-1 `.nii` | ✅ | 3D MRI and 4D fMRI; little- and big-endian |
| Numeric data | ✅ | `uint8/int8/int16/uint16/int32/uint32/float32/float64` |
| Intensity processing | ✅ | Applies `scl_slope`/`scl_inter` and a 2%–98% percentile window |
| `.nii.gz`, NIfTI-2 | Planned | Real fixtures exist; decompression/parsing is pending |
| BIDS JSON/TSV | Planned | Sidecars, events, and dataset relationships |
| EDF/EDF+, BrainVision, EEGLAB | Planned | Multichannel waveform and marker adapters |
| NWB, FIF, CIFTI, GIFTI | Planned | Intended for an optional Python worker |

Images currently follow voxel storage order; qform/sform reorientation is not yet applied. NeuroPreviewer is for research-data inspection and development, not clinical interpretation or diagnosis.

## Install

### Requirements

- Node.js `^22.19.0` or `>=24.0.0`
- npm and pnpm
- DeepSeek Harness `0.1.0-rc.6`

### Stable npm release (static preview)

```bash
dsh plugin --profile web add @brainpilot/dsh-neuro-previewer@0.1.0
dsh --profile web --dump-config
dsh --profile web
```

### Interactive alpha from source

```bash
git clone https://github.com/NeuroAIHub/NeuroPreviewer.git
cd NeuroPreviewer
npm install
npm run check

dsh plugin --profile web add "$(pwd)"
dsh --profile web --dump-config
dsh --profile web
```

The dumped configuration should include:

```yaml
- id: neuro-previewer
  name: '@brainpilot/dsh-neuro-previewer'
  config:
    maxFileBytes: 268435456
    maxSlicePixels: 4194304
    maxOpenDatasets: 2
    maxTimeSeriesPoints: 1024
```

## Use the interactive workbench

1. Start the DSH Web profile.
2. Click **NeuroPreviewer** in the DSH sidebar.
3. If one workspace is registered, its root opens immediately; otherwise choose a workspace.
4. Expand folders in the tree, select a `.nii` file, and click **Open viewer** (or double-click the file). Parent folders stay visible.
5. Click any anatomical plane or move X/Y/Z to change the shared voxel.
6. For 4D data, scrub or play the time control; the selected-voxel plot updates with it.

The compact popup leaves the DSH page visible and does not add a full-screen backdrop. It hides dot-prefixed entries and unsupported files. An advanced absolute-path field remains available under **Open another host path…**.

The same viewer can be opened from the preview card after a conversational tool call. Conversation is an optional entry point, not a requirement for interaction.

Example `neuro_preview` input:

```json
{
  "path": "/absolute/path/to/image.nii",
  "axis": "axial",
  "index": 48,
  "volume": 0
}
```

Without the Web extension, the tool still returns a text summary of dimensions, voxel size, datatype, location, intensity range, and warnings.

## Architecture

```text
DSH sidebar ───────────────┐
                          ├──► Web MPR workbench
neuro_preview result card ┘          │
                                     │ loopback RPC: workspaces / browse / open / view / close
                                     ▼
                            InteractiveNeuroPreview
                              bounded Host cache
                                     │
                                     ▼
                           NIfTI parser and slicer
                                     │
                  three 2D frames + sampled voxel series
                                     ▼
                                  Browser
```

The static tool path and interactive session share the same format-neutral NIfTI core. The important module boundaries are:

- `src/core/nifti.ts`: validates NIfTI-1 and extracts slices, voxel values, and time series.
- `src/core/interactive.ts`: owns bounded datasets and produces synchronized MPR views.
- `src/dsh/source.ts`: adapts DSH `ctx.fs` into a size-limited binary source.
- `src/dsh/rpc.ts`: exposes loopback-only `open`, `view`, and `close` operations.
- `src/dsh/workspace-browser.ts`: lists registered roots and filters contained directories and supported files.
- `src/index.ts`: registers the Host tool, configuration, and RPC service.
- `src/client/workbench.tsx`: renders the DSH MPR workbench and direct controls.

## Testing with real neuroscience data

Real datasets are downloaded to gitignored `test-data/real/`; they are not committed or packed. Downloads are verified against [scripts/real-data.sha256](scripts/real-data.sha256).

```bash
npm run data:download  # complete corpus, approximately 190 MiB
npm run test:real
```

The real-data smoke test parses an OpenNeuro `160 × 192 × 192` T1 image and a `64 × 64 × 34 × 240` fMRI image. The corpus also contains real EDF+, BrainVision, EEGLAB, and NWB fixtures as explicit pending-format cases. See [docs/real-datasets.md](docs/real-datasets.md) for sources, licenses, citations, privacy notes, and hashes.

## Development

```bash
npm run typecheck  # strict TypeScript
npm test           # parser, MPR session, RPC, DSH integration
npx playwright install chromium # one-time browser setup
npm run test:design # browser checks for the three approved design prototypes
npm run test:real  # real NIfTI smoke tests
npm run build      # Host ESM and DSH Web client bundles
npm run check      # typecheck + unit tests + build
```

The DSH browser integration check covers workspace traversal, direct opening, a real 4D dataset, linked position changes, time movement, and the selected-voxel plot. Design exploration and reproducible browser checks live under `design-demos/`; `verify-dsh-integration.cjs` accepts a running DSH URL and an absolute NIfTI path.

## Safety and limits

- File access is read-only and goes through DSH `ctx.fs`.
- The RPC is registered with loopback authority.
- The Host defaults to a 256 MiB file limit and two cached open datasets.
- Slice size defaults to 4,194,304 pixels; time-series transfer defaults to 1,024 samples.
- The browser receives three normalized 2D frames and a bounded time series, not the full volume.
- Header-derived dimensions, offsets, and multiplications are checked as safe integers.
- Reads and view requests support cancellation; stale UI responses are discarded.
- DSH currently has no filesystem byte-range read, so the Host reads each accepted file in full.

## Roadmap

1. `.nii.gz`, NIfTI-2, and qform/sform anatomical reorientation.
2. Window/level controls, overlays, colormaps, and keyboard navigation.
3. BIDS relationships, JSON/TSV tables, and event timelines.
4. EDF/EDF+, BrainVision, and EEGLAB waveform viewers.
5. Optional Python worker for NWB, MNE FIF, CIFTI, and GIFTI.

## License

NeuroPreviewer is released under the [MIT License](LICENSE). Real test datasets remain subject to their original licenses, citation requirements, and privacy terms.
