# BrainPilot Neuro Preview for DeepSeek Harness

Read-only neuroscience data previews inside DeepSeek Harness (DSH).

> Status: early alpha. The first implemented vertical slice supports single-file
> NIfTI-1 `.nii` images. The public interfaces are expected to change while DSH
> itself remains in release-candidate development.

## Implemented

- `neuro_preview` DSH tool.
- NIfTI-1 header validation by magic and `sizeof_hdr`.
- Little- and big-endian images.
- `uint8`, `int8`, `int16`, `uint16`, `int32`, `uint32`, `float32`, and `float64` data.
- Axial, coronal, and sagittal slices.
- 4D volume selection.
- NIfTI slope/intercept scaling and percentile intensity windowing.
- Bounded whole-file reads through `ctx.fs` and bounded slice allocation.
- DSH Web custom tool row with a grayscale canvas preview.
- Pure TypeScript parser tests using deterministic synthetic fixtures.

## Not implemented yet

- NIfTI-2, `.nii.gz`, anatomical reorientation, overlays, or interactive RPC navigation.
- BIDS, EDF/EDF+, BrainVision, CSV/TSV, FIF, EEGLAB, or NWB.
- Python worker integration.

## Development

```bash
npm install
npm run check
```

Create an installable artifact:

```bash
npm pack
```

Install a checkout into a DSH Web profile:

```bash
dsh plugin --profile web add /absolute/path/to/dsh-neuro-preview
dsh --profile web --dump-config
dsh --profile web
```

Then ask the model to call:

```json
{
  "path": "/absolute/path/to/image.nii",
  "axis": "axial",
  "index": 20,
  "volume": 0
}
```

## Roadmap

1. NIfTI-2, gzip decompression, orientation transforms, and host/client preview sessions.
2. BIDS sidecars and TSV tables.
3. EDF/EDF+ and BrainVision signal previews.
4. Optional Python worker for FIF, EEGLAB, and NWB.

## Security model

The plugin performs read-only access through DSH's `ctx.fs` capability. It caps
the complete file size, validates header-derived allocation sizes, caps slice
pixels, cooperates with cancellation, and sends only one normalized grayscale
slice to the browser. The current alpha uses a whole-file read because the DSH
filesystem Interface does not expose byte-range reads.
