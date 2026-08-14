# NeuroPreviewer

[![npm version](https://img.shields.io/npm/v/%40brainpilot%2Fdsh-neuro-previewer)](https://www.npmjs.com/package/@brainpilot/dsh-neuro-previewer)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/DeepSeek%20Harness-plugin-5B5BD6)](https://github.com/deepseek-ai/deepseek-harness)

**English** | [简体中文](README.zh-CN.md)

> Preview neuroscience data directly inside DeepSeek Harness.

**NeuroPreviewer is a neuroscience data preview plugin for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness).** It is installed as a DSH bundle with a Web client extension—not as a standalone viewer. The model inspects local data through the read-only `neuro_preview` tool, while the DSH Web client renders the result as a dedicated preview card.

`@brainpilot/dsh-neuro-previewer` · [GitHub](https://github.com/NeuroAIHub/NeuroPreviewer) · [MIT License](LICENSE)

> **Compatibility:** Version `0.1.0` targets DeepSeek Harness `0.1.0-rc.6`. DSH remains a developer preview and may introduce breaking interface changes.

## Why NeuroPreviewer?

NeuroPreviewer gives a DSH agent a safe, compact way to answer basic questions about a neuroscience file without sending the full dataset to the browser. The Host plugin reads and validates the file through DSH's filesystem interface, creates a bounded 2D preview, and returns structured metadata plus a Web-friendly grayscale frame.

Current priorities are reproducibility, explicit resource limits, and graceful text output when the Web client is unavailable.

## Current capabilities

| Capability | Status | Details |
| --- | --- | --- |
| Single-file NIfTI-1 `.nii` | ✅ | Validates `sizeof_hdr=348` and the `n+1` magic |
| 3D MRI | ✅ | Axial, coronal, and sagittal slices |
| 4D fMRI | ✅ | Selectable zero-based `volume` |
| Numeric data | ✅ | `uint8/int8/int16/uint16/int32/uint32/float32/float64` |
| Intensity processing | ✅ | Applies `scl_slope`/`scl_inter` and a 2%–98% percentile window |
| Endianness | ✅ | Little-endian and big-endian files |
| DSH Web preview card | ✅ | Canvas image, dimensions, datatype, plane, and intensity range |
| `.nii.gz` and NIfTI-2 | Planned | Real fixtures are available; decompression/parsing is not implemented yet |
| BIDS metadata and CSV/TSV | Planned | Real BIDS sidecars and events files are available |
| EDF/EDF+, BrainVision, EEGLAB | Planned | Real EEG/PSG fixtures are available; adapters are pending |
| NWB and FIF | Planned | Intended for an optional Python worker |

The current renderer follows voxel storage order and does not yet reorient images using qform/sform. NeuroPreviewer is intended for research-data inspection and development—not clinical interpretation or diagnosis.

## Quick start

### Requirements

- Node.js `^22.19.0` or `>=24.0.0`
- npm and pnpm
- DeepSeek Harness `0.1.0-rc.6`

### Install from npm

```bash
dsh plugin --profile web add @brainpilot/dsh-neuro-previewer@0.1.0
dsh --profile web --dump-config
dsh --profile web
```

### Build and install from source

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
```

## Using `neuro_preview`

Example tool input:

```json
{
  "path": "/absolute/path/to/image.nii",
  "axis": "axial",
  "index": 48,
  "volume": 0
}
```

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `path` | Yes | — | Path to a `.nii` file accessible through the DSH filesystem |
| `axis` | No | `axial` | `axial`, `coronal`, or `sagittal` |
| `index` | No | Middle slice | Zero-based slice index |
| `volume` | No | `0` | Zero-based volume index for 4D data |

Without the Web extension, the tool still returns a text summary containing dimensions, voxel size, datatype, slice position, intensity range, and warnings.

## Testing with real neuroscience data

Real datasets are downloaded to the gitignored `test-data/real/` directory and are never included in the repository or npm package. Every downloaded file is checked against [scripts/real-data.sha256](scripts/real-data.sha256).

Download the complete corpus—approximately 190 MiB—and run the real-data smoke test:

```bash
npm run data:download
npm run test:real
```

Individual format groups can also be downloaded:

```bash
bash scripts/download-real-data.sh nifti
bash scripts/download-real-data.sh edf
bash scripts/download-real-data.sh brainvision
bash scripts/download-real-data.sh eeglab
bash scripts/download-real-data.sh nwb
```

| Source | Domain and format | Local fixtures | Preview support |
| --- | --- | --- | --- |
| OpenNeuro `ds000005` | Human structural MRI and task fMRI; BIDS/NIfTI | 3D T1, 240-volume BOLD, JSON/TSV, compressed and uncompressed NIfTI | ✅ Two `.nii` files |
| PhysioNet Sleep-EDF Expanded | Human sleep EEG/PSG; EDF+ | PSG and Hypnogram | Adapter pending |
| PhysioNet EEGMMIDB | Human motor-imagery EEG; EDF+ | 64-channel baseline recording | Adapter pending |
| OpenNeuro `ds007629` | Human natural-reading EEG; BrainVision | `.vhdr/.vmrk/.eeg` triplet | Adapter pending |
| EEGLAB sample data | Human EEG; `.set/.fdt` and BrainVision | EEGLAB pair and a compact BrainVision regression sample | Adapter pending |
| DANDI `000006` | Mouse ALM extracellular electrophysiology; NWB | Two compact `.nwb` sessions | Python worker pending |

The current smoke test parses a real `160 × 192 × 192` 3D T1 image and a real `64 × 64 × 34 × 240` 4D fMRI image. Unsupported formats remain in the corpus as explicit negative fixtures so future adapters are tested against real files rather than synthetic substitutes.

See [docs/real-datasets.md](docs/real-datasets.md) for pinned download URLs, licenses, citations, privacy notes, and per-file hashes. Public or de-identified human data must never be used for re-identification attempts.

## Development and verification

```bash
npm run typecheck  # Strict TypeScript checking
npm test           # Synthetic unit and contract tests
npm run test:real  # Smoke tests against locally downloaded real NIfTI data
npm run build      # Host ESM and DSH Web client bundles
npm run check      # typecheck + unit tests + build
```

The synthetic suite covers header validation, truncated inputs, little/big endian data, all three slice planes, 4D volumes, slope/intercept scaling, invalid indices, pixel limits, cancellation, DSH tool registration, filesystem adaptation, text output, and client presentation metadata.

## Architecture

```text
DSH neuro_preview Tool
        │
        ▼
NeuroPreview Interface
        │
        ├── NIfTI Adapter (current)
        ├── EDF / BrainVision Adapters (planned)
        └── Python Worker Adapter (planned: NWB/FIF/EEGLAB)
        │
        ▼
Unified PreviewDocument
        │
        ▼
DSH Web NeuroPreviewRow + Canvas
```

The format-neutral core is kept separate from the DSH integration:

- `src/core/preview.ts` defines the `NeuroPreview` interface.
- `src/core/nifti.ts` detects and parses NIfTI-1 files and extracts slices.
- `src/dsh/source.ts` adapts DSH `ctx.fs` into a bounded `BinarySource`.
- `src/index.ts` registers the Host tool and model-facing output.
- `src/client.tsx` implements the DSH Web tool card.

## Safety and resource limits

- File access is read-only and goes exclusively through DSH `ctx.fs`.
- The default maximum file size is 256 MiB.
- The default maximum slice size is 4,194,304 pixels.
- Header-derived dimensions, offsets, and multiplications are checked as safe integers.
- Parsing supports `AbortSignal` cancellation.
- The browser receives one normalized grayscale slice, never the complete volume.
- Because the current DSH filesystem interface has no byte-range read, the Host reads the full file within the configured size limit.

## Roadmap

1. `.nii.gz`, NIfTI-2, qform/sform reorientation, and interactive slice sessions.
2. BIDS dataset relationships, JSON/TSV tables, and event timelines.
3. EDF/EDF+ and BrainVision multichannel waveforms and markers.
4. EEGLAB `.set/.fdt` support.
5. Optional Python worker for NWB, MNE FIF, CIFTI, and GIFTI.

## License

NeuroPreviewer is released under the [MIT License](LICENSE). Real test datasets are not redistributed with the source code and remain subject to their original licenses, citation requirements, and privacy terms.
