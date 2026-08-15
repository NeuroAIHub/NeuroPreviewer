# NeuroPreviewer interactive viewer facts

- Verified on 2026-08-15 against the local `0.2.0-alpha.5` source and installed DeepSeek Harness `0.1.0-rc.6` packages.
- The released plugin currently opens through the `neuro_preview` Tool and renders one static Canvas slice inside a Tool-result row.
- The interactive Host supports NIfTI-1 `.nii/.nii.gz`, EDF/EDF+, BrainVision `.vhdr/.eeg`, EEGLAB `.set/.fdt`, and the NWB Units spike-time subset.
- Volume data uses X/Y/Z/T direct controls. Signal data uses a movable time window, selectable duration, and channel paging with bounded waveform transfer.
- The DSH client layout exposes an additive root `shell.overlay` slot and sidebar footer action slot. These can host a dedicated viewer without replacing the conversation surface.
- `@deepseek-ai/dsh-client-connection` exposes a generic RPC interface: Host plugins register a logical channel with `ctx.connection.rpc.handle()`, while Client plugins invoke it with `ctx.connection.rpc.call()`.
- The current DSH filesystem interface has no byte-range read. A production viewer should therefore open and cache a bounded file on the Host, then return only requested slices to the browser.
- Real local fixtures cover OpenNeuro T1/fMRI, PhysioNet EDF/EDF+, OpenNeuro BrainVision, EEGLAB sample data, and DANDI NWB Units tables.
