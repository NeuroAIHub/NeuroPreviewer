# NeuroPreviewer interactive viewer facts

- Verified on 2026-08-14 against the local `v0.1.0` source and installed DeepSeek Harness `0.1.0-rc.6` packages.
- The released plugin currently opens through the `neuro_preview` Tool and renders one static Canvas slice inside a Tool-result row.
- Current selectable dimensions are `axis`, `index`, and `volume`; the Host parser supports NIfTI-1 `.nii` data and treats dimensions 1–3 as X/Y/Z and dimension 4 as volume/time.
- The DSH client layout exposes an additive root `shell.overlay` slot and sidebar footer action slot. These can host a dedicated viewer without replacing the conversation surface.
- `@deepseek-ai/dsh-client-connection` exposes a generic RPC interface: Host plugins register a logical channel with `ctx.connection.rpc.handle()`, while Client plugins invoke it with `ctx.connection.rpc.call()`.
- The current DSH filesystem interface has no byte-range read. A production viewer should therefore open and cache a bounded file on the Host, then return only requested slices to the browser.
- Real local fixtures used by the prototypes: OpenNeuro `ds000005` T1 MRI (`160 × 192 × 192`) and task fMRI (`64 × 64 × 34 × 240`).
