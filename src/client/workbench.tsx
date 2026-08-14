import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { WireImage2DFrame, VoxelCursor, WireInteractivePreviewView } from '../core/types.js'
import type { NeuroViewerController } from './controller.js'

const workbenchCss = `
.np-shell{position:fixed;inset:8px;z-index:80;pointer-events:auto;display:grid;grid-template-rows:52px minmax(0,1fr) 104px;background:#151719;color:#eef0f1;border:1px solid #3a3e42;box-shadow:0 22px 70px #000b;font:14px/1.35 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
.np-shell *{box-sizing:border-box}.np-shell button,.np-shell input{font:inherit}.np-top{display:grid;grid-template-columns:210px minmax(0,1fr) auto;align-items:center;gap:16px;padding:0 14px;background:#111315;border-bottom:1px solid #383d41}.np-brand{font-weight:680;letter-spacing:-.02em}.np-brand small{display:block;color:#42d3c8;font:10px ui-monospace,SFMono-Regular,monospace;letter-spacing:.09em}.np-path{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#9ba2a6;font:12px ui-monospace,SFMono-Regular,monospace}.np-actions{display:flex;gap:7px}.np-button{border:1px solid #454a4e;background:#22262a;color:#eef0f1;padding:7px 11px;cursor:pointer}.np-button:hover{background:#2b3034}.np-button-primary{background:#eef0f1;color:#151719;border-color:#eef0f1}.np-button-danger{color:#e1a39e}.np-main{min-height:0;display:grid;grid-template-columns:minmax(620px,1fr) 280px;overflow:hidden}.np-mpr{min-height:0;padding:8px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:minmax(0,1fr) minmax(0,1fr);gap:7px;background:#0d0f10}.np-plane{position:relative;min-width:0;min-height:0;display:grid;place-items:center;background:#030404;border:1px solid #2f3437;overflow:hidden;cursor:crosshair}.np-plane canvas{display:block;max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain;image-rendering:pixelated}.np-plane-label{position:absolute;top:7px;left:9px;color:#42d3c8;font:11px ui-monospace,SFMono-Regular,monospace;letter-spacing:.07em;text-transform:uppercase;background:#0009;padding:2px 4px}.np-plane-meta{position:absolute;right:7px;bottom:6px;color:#c9cdcf;background:#000a;padding:2px 5px;font:10px ui-monospace,SFMono-Regular,monospace}.np-cross-v,.np-cross-h{position:absolute;background:#42d3c8;opacity:.84;pointer-events:none}.np-cross-v{width:1px;top:0;bottom:0}.np-cross-h{height:1px;left:0;right:0}.np-cross-dot{position:absolute;width:7px;height:7px;margin:-3px 0 0 -3px;border:1px solid #42d3c8;border-radius:50%;background:#111b;pointer-events:none}.np-analysis{min-height:0;background:#171a1c;padding:14px;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:10px;overflow:hidden}.np-analysis h2{font-size:15px;margin:0}.np-analysis p{margin:3px 0 0;color:#9ba2a6;font-size:12px}.np-plot{min-height:0;border:1px solid #34393c;background:repeating-linear-gradient(0deg,transparent 0 31px,#23272a 32px),repeating-linear-gradient(90deg,transparent 0 47px,#23272a 48px);padding:8px}.np-plot svg{width:100%;height:100%;overflow:visible}.np-trace{fill:none;stroke:#42d3c8;stroke-width:1.6}.np-time-cursor{stroke:#f2b84b;stroke-width:1}.np-readout{display:grid;grid-template-columns:1fr auto;gap:6px;color:#9ba2a6;font-size:12px}.np-readout b{color:#eef0f1;font:11px ui-monospace,SFMono-Regular,monospace;font-weight:500}.np-side{min-height:0;overflow:auto;padding:16px 15px;background:#1c1f22;border-left:1px solid #383d41}.np-section{padding-bottom:15px;margin-bottom:15px;border-bottom:1px solid #383d41}.np-section-title{margin-bottom:12px;color:#9ba2a6;font:10px ui-monospace,SFMono-Regular,monospace;text-transform:uppercase;letter-spacing:.11em}.np-control{margin-bottom:13px}.np-control label{display:flex;justify-content:space-between;margin-bottom:5px}.np-control output{color:#42d3c8;font:11px ui-monospace,SFMono-Regular,monospace}.np-control input{width:100%;accent-color:#42d3c8}.np-kv{display:grid;grid-template-columns:1fr auto;gap:8px;color:#9ba2a6;font-size:12px}.np-kv b{color:#eef0f1;font:11px ui-monospace,SFMono-Regular,monospace;font-weight:500}.np-warning{color:#d1ad6f;border-left:2px solid #f2b84b;padding-left:9px;font-size:11px}.np-timebar{display:grid;grid-template-columns:138px minmax(0,1fr) 210px;align-items:center;gap:18px;padding:12px 16px;background:#111315;border-top:1px solid #383d41}.np-transport{display:flex;gap:7px}.np-transport button{width:34px;height:34px;padding:0;border:1px solid #454a4e;background:#22262a;color:#eef0f1;cursor:pointer}.np-transport .np-play{background:#f2b84b;color:#161719;border-color:#f2b84b}.np-time label{display:flex;justify-content:space-between;margin-bottom:5px;color:#9ba2a6;font:11px ui-monospace,SFMono-Regular,monospace}.np-time output{color:#f2b84b}.np-time input{width:100%;accent-color:#f2b84b}.np-time-value{text-align:right;color:#9ba2a6;font-size:11px}.np-time-value strong{display:block;color:#f2b84b;font:18px ui-monospace,SFMono-Regular,monospace}.np-loading{position:absolute;top:64px;right:18px;z-index:3;background:#111d;border:1px solid #3d4245;padding:6px 9px;color:#9ba2a6;font-size:12px}.np-dialog-backdrop{position:fixed;inset:0;z-index:90;display:grid;place-items:center;background:#080909d9;pointer-events:auto}.np-dialog{width:min(540px,calc(100vw - 40px));background:#1c1f22;border:1px solid #484d51;padding:24px;color:#eef0f1}.np-dialog h2{margin:0 0 7px;font-size:20px}.np-dialog p{margin:0 0 18px;color:#a4aaad}.np-dialog input{width:100%;padding:10px 11px;background:#111315;border:1px solid #4a5054;color:#eef0f1;font:13px ui-monospace,SFMono-Regular,monospace}.np-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.np-error{margin-top:12px;color:#e4aaa5;font-size:12px}.np-trigger{display:flex;align-items:center;justify-content:center;gap:8px;min-width:40px;height:40px;padding:0 11px;border:0;background:transparent;color:var(--ds-text-secondary,#aaa);cursor:pointer}.np-trigger:hover{color:var(--ds-text-primary,#fff);background:var(--ds-bg-hover,#ffffff0c)}.np-trigger-mark{font:16px ui-monospace,SFMono-Regular,monospace;color:#42d3c8}.np-tool-open{margin-top:8px;border:1px solid currentColor;background:transparent;color:var(--ds-text-secondary,#888);padding:5px 9px;cursor:pointer}.np-tool-open:hover{color:var(--ds-text-primary,#eee)}
@media(max-width:980px){.np-shell{inset:0}.np-main{grid-template-columns:1fr}.np-side{display:none}.np-timebar{grid-template-columns:120px 1fr}.np-time-value{display:none}}
`

function drawFrame(canvas: HTMLCanvasElement, frame: WireImage2DFrame): void {
  const context = canvas.getContext('2d')
  if (context === null) return
  const binary = atob(frame.pixelsBase64)
  canvas.width = frame.width
  canvas.height = frame.height
  const image = context.createImageData(frame.width, frame.height)
  for (let index = 0; index < binary.length; index += 1) {
    const value = binary.charCodeAt(index)
    const offset = index * 4
    image.data[offset] = value
    image.data[offset + 1] = value
    image.data[offset + 2] = value
    image.data[offset + 3] = 255
  }
  context.putImageData(image, 0, 0)
}

type Axis = 'axial' | 'coronal' | 'sagittal'

function planePosition(axis: Axis, cursor: VoxelCursor, dimensions: readonly number[]) {
  const [x = 1, y = 1, z = 1] = dimensions
  if (axis === 'axial') return { horizontal: cursor.y / Math.max(1, y - 1), vertical: cursor.x / Math.max(1, x - 1) }
  if (axis === 'coronal') return { horizontal: cursor.z / Math.max(1, z - 1), vertical: cursor.x / Math.max(1, x - 1) }
  return { horizontal: cursor.z / Math.max(1, z - 1), vertical: cursor.y / Math.max(1, y - 1) }
}

function Plane({ axis, frame, cursor, dimensions, onPick }: {
  readonly axis: Axis
  readonly frame: WireImage2DFrame
  readonly cursor: VoxelCursor
  readonly dimensions: readonly number[]
  readonly onPick: (axis: Axis, horizontal: number, vertical: number) => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (canvas.current !== null) drawFrame(canvas.current, frame)
  }, [frame])
  const position = planePosition(axis, cursor, dimensions)
  const index = axis === 'axial' ? cursor.z : axis === 'coronal' ? cursor.y : cursor.x
  return (
    <div className="np-plane" onPointerDown={event => {
      const bounds = event.currentTarget.getBoundingClientRect()
      onPick(axis,
        Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
        Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
      )
    }}>
      <canvas ref={canvas} aria-label={`${axis} slice ${index}`} />
      <span className="np-plane-label">{axis} · {index}</span>
      <span className="np-cross-v" style={{ left: `${position.vertical * 100}%` }} />
      <span className="np-cross-h" style={{ top: `${position.horizontal * 100}%` }} />
      <span className="np-cross-dot" style={{ left: `${position.vertical * 100}%`, top: `${position.horizontal * 100}%` }} />
      <span className="np-plane-meta">{frame.width} × {frame.height}</span>
    </div>
  )
}

function seriesPoints(view: WireInteractivePreviewView): string {
  const { indices, values, min, max } = view.timeSeries
  const range = max > min ? max - min : 1
  const lastIndex = Math.max(1, indices.at(-1) ?? 1)
  return values.map((value, index) => {
    const x = ((indices[index] ?? 0) / lastIndex) * 1000
    const y = 92 - ((value - min) / range) * 82
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
}

function TimeSeries({ view }: { readonly view: WireInteractivePreviewView }) {
  const last = Math.max(1, view.timeSeries.indices.at(-1) ?? 1)
  const cursorX = view.cursor.volume / last * 1000
  return (
    <div className="np-plot">
      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-label="Selected voxel time series">
        <polyline className="np-trace" points={seriesPoints(view)} />
        <line className="np-time-cursor" x1={cursorX} x2={cursorX} y1="0" y2="100" />
      </svg>
    </div>
  )
}

function PathDialog({ controller, initialPath, cancellable, onCancel }: {
  readonly controller: NeuroViewerController
  readonly initialPath: string
  readonly cancellable: boolean
  readonly onCancel?: () => void
}) {
  const [path, setPath] = useState(initialPath)
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  return (
    <div className="np-dialog-backdrop">
      <form className="np-dialog" onSubmit={event => {
        event.preventDefault()
        if (path.trim().length > 0) void controller.open(path.trim())
      }}>
        <h2>Open neuroscience data</h2>
        <p>Enter a host path accessible to the current DSH workspace. NIfTI-1 <code>.nii</code> is supported.</p>
        <input autoFocus value={path} onChange={event => setPath(event.target.value)} placeholder="/absolute/path/to/image.nii" aria-label="Dataset path" />
        {snapshot.error === undefined ? null : <div className="np-error">{snapshot.error}</div>}
        <div className="np-dialog-actions">
          {cancellable ? <button className="np-button" type="button" onClick={() => { if (onCancel === undefined) controller.hide(); else onCancel() }}>Cancel</button> : null}
          <button className="np-button np-button-primary" disabled={snapshot.loading || path.trim().length === 0} type="submit">{snapshot.loading ? 'Opening…' : 'Open viewer'}</button>
        </div>
      </form>
    </div>
  )
}

function clampCursor(cursor: VoxelCursor, dimensions: readonly number[]): VoxelCursor {
  const [x = 1, y = 1, z = 1, t = 1] = dimensions
  return {
    x: Math.max(0, Math.min(x - 1, cursor.x)),
    y: Math.max(0, Math.min(y - 1, cursor.y)),
    z: Math.max(0, Math.min(z - 1, cursor.z)),
    volume: Math.max(0, Math.min(t - 1, cursor.volume)),
  }
}

export function NeuroWorkbench({ controller }: { readonly controller: NeuroViewerController }) {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const [cursor, setCursor] = useState<VoxelCursor>({ x: 0, y: 0, z: 0, volume: 0 })
  const [showPath, setShowPath] = useState(false)
  const [playing, setPlaying] = useState(false)
  const dataset = snapshot.dataset
  const view = snapshot.view
  const dimensions = dataset?.metadata.dimensions ?? [1, 1, 1, 1]

  useEffect(() => {
    if (view !== undefined) setCursor(view.cursor)
  }, [dataset?.datasetId, view])

  useEffect(() => {
    if (dataset !== undefined) setShowPath(false)
  }, [dataset?.datasetId])

  useEffect(() => {
    if (dataset === undefined || view === undefined) return
    if (Object.keys(cursor).every(key => cursor[key as keyof VoxelCursor] === view.cursor[key as keyof VoxelCursor])) return
    const timeout = window.setTimeout(() => void controller.view(clampCursor(cursor, dimensions)), 80)
    return () => window.clearTimeout(timeout)
  }, [controller, cursor, dataset, dimensions, view])

  useEffect(() => {
    if (!playing) return
    const maxVolume = (dimensions[3] ?? 1) - 1
    const timer = window.setInterval(() => setCursor(current => ({
      ...current,
      volume: current.volume >= maxVolume ? 0 : current.volume + 1,
    })), 140)
    return () => window.clearInterval(timer)
  }, [dimensions, playing])

  if (!snapshot.visible) return null
  if (dataset === undefined || view === undefined) return <PathDialog controller={controller} initialPath="" cancellable />

  const update = (key: keyof VoxelCursor, value: number) => setCursor(current => clampCursor({ ...current, [key]: value }, dimensions))
  const pick = (axis: Axis, horizontal: number, vertical: number) => setCursor(current => {
    const [x = 1, y = 1, z = 1] = dimensions
    if (axis === 'axial') return { ...current, x: Math.round(vertical * (x - 1)), y: Math.round(horizontal * (y - 1)) }
    if (axis === 'coronal') return { ...current, x: Math.round(vertical * (x - 1)), z: Math.round(horizontal * (z - 1)) }
    return { ...current, y: Math.round(vertical * (y - 1)), z: Math.round(horizontal * (z - 1)) }
  })
  const [xDim = 1, yDim = 1, zDim = 1, tDim = 1] = dimensions
  const voxel = dataset.metadata.voxelSize.slice(0, 3).map(value => value.toFixed(2)).join(' × ')
  const timeLabel = dataset.metadata.voxelSize[3] === undefined ? undefined : `${(cursor.volume * dataset.metadata.voxelSize[3]).toFixed(2)} s`

  return <>
    <style>{workbenchCss}</style>
    <section className="np-shell" role="dialog" aria-modal="true" aria-label="NeuroPreviewer interactive viewer">
      <header className="np-top">
        <div className="np-brand">NeuroPreviewer<small>MPR WORKBENCH</small></div>
        <div className="np-path" title={dataset.path}>{dataset.path}</div>
        <div className="np-actions"><button className="np-button" onClick={() => setCursor(view.cursor)}>Reset</button><button className="np-button np-button-primary" onClick={() => setShowPath(true)}>Open file</button><button className="np-button np-button-danger" onClick={() => controller.hide()} aria-label="Close viewer">Close</button></div>
      </header>
      <div className="np-main">
        <main className="np-mpr">
          <Plane axis="axial" frame={view.frames.axial} cursor={cursor} dimensions={dimensions} onPick={pick} />
          <Plane axis="coronal" frame={view.frames.coronal} cursor={cursor} dimensions={dimensions} onPick={pick} />
          <Plane axis="sagittal" frame={view.frames.sagittal} cursor={cursor} dimensions={dimensions} onPick={pick} />
          <section className="np-analysis"><div><h2>Selected voxel over time</h2><p>X {cursor.x} · Y {cursor.y} · Z {cursor.z}</p></div><TimeSeries view={view} /><div className="np-readout"><span>Current value</span><b>{view.cursorValue.toPrecision(5)}</b><span>Series range</span><b>{view.timeSeries.min.toPrecision(4)} — {view.timeSeries.max.toPrecision(4)}</b></div></section>
        </main>
        <aside className="np-side">
          <section className="np-section"><div className="np-section-title">Shared position</div>{([
            ['x', xDim], ['y', yDim], ['z', zDim],
          ] as const).map(([key, length]) => <div className="np-control" key={key}><label>{key.toUpperCase()} <output>{cursor[key]} / {length - 1}</output></label><input aria-label={`${key} position`} type="range" min="0" max={length - 1} value={cursor[key]} onChange={event => update(key, Number(event.target.value))} /></div>)}</section>
          <section className="np-section"><div className="np-section-title">Dataset</div><div className="np-kv"><span>Shape</span><b>{dimensions.join('×')}</b><span>Datatype</span><b>{dataset.metadata.datatype}</b><span>Voxel</span><b>{voxel}</b><span>Cursor</span><b>{cursor.x},{cursor.y},{cursor.z}</b></div></section>
          <div className="np-warning">Research preview. Anatomical qform/sform reorientation is not applied yet.</div>
        </aside>
      </div>
      <footer className="np-timebar">
        <div className="np-transport"><button onClick={() => update('volume', Math.max(0, cursor.volume - 1))}>←</button><button className="np-play" onClick={() => setPlaying(value => !value)}>{playing ? 'Ⅱ' : '▶'}</button><button onClick={() => update('volume', Math.min(tDim - 1, cursor.volume + 1))}>→</button></div>
        <div className="np-time"><label><span>TIME / VOLUME</span><output>{cursor.volume} / {tDim - 1}</output></label><input aria-label="Time volume" type="range" min="0" max={tDim - 1} value={cursor.volume} onChange={event => update('volume', Number(event.target.value))} /></div>
        <div className="np-time-value"><strong>T {cursor.volume}</strong>{timeLabel ?? 'Volume index'}</div>
      </footer>
      {snapshot.loading ? <div className="np-loading">Updating preview…</div> : null}
      {showPath ? <PathDialog controller={controller} initialPath={dataset.path} cancellable onCancel={() => setShowPath(false)} /> : null}
    </section>
  </>
}

export function NeuroPreviewTrigger({ wide, controller }: { readonly wide: boolean, readonly controller: NeuroViewerController }) {
  return <><style>{workbenchCss}</style><button className="np-trigger" onClick={() => controller.show()} title="Open NeuroPreviewer"><span className="np-trigger-mark">⌗</span>{wide ? <span>NeuroPreviewer</span> : null}</button></>
}
