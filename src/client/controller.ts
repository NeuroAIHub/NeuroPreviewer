import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import type {
  InteractiveViewRequest,
  NeuroWorkspaceListing,
  NeuroWorkspaceSummary,
  VoxelCursor,
  WireInteractiveDataset,
  WireInteractivePreviewView,
} from '../core/types.js'

export interface ViewerSnapshot {
  readonly visible: boolean
  readonly loading: boolean
  readonly dataset?: WireInteractiveDataset
  readonly view?: WireInteractivePreviewView
  readonly workspaces?: readonly NeuroWorkspaceSummary[]
  readonly listing?: NeuroWorkspaceListing
  readonly error?: string
}

const CLOSED: ViewerSnapshot = Object.freeze({ visible: false, loading: false })

function resultValue<T>(result: Awaited<ReturnType<ClientConnectionRpc['call']>>): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value as T
}

export class NeuroViewerController {
  #snapshot: ViewerSnapshot = CLOSED
  #listeners = new Set<() => void>()
  #request?: AbortController
  #generation = 0

  constructor(private readonly rpc: ClientConnectionRpc) {}

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  readonly getSnapshot = (): ViewerSnapshot => this.#snapshot

  show(path?: string): void {
    const { error: _error, ...snapshot } = this.#snapshot
    this.#set({ ...snapshot, visible: true })
    if (path !== undefined) void this.open(path)
    else if (this.#snapshot.dataset === undefined) void this.loadWorkspaces()
  }

  async loadWorkspaces(): Promise<void> {
    const { signal, generation } = this.#beginRequest()
    const { error: _error, listing: _listing, ...snapshot } = this.#snapshot
    this.#set({ ...snapshot, visible: true, loading: true })
    try {
      const result = await this.rpc.call('/neuro-preview', 'workspaces', {}, signal)
      if (generation !== this.#generation) return
      const workspaces = resultValue<readonly NeuroWorkspaceSummary[]>(result)
      this.#set({ ...snapshot, visible: true, loading: false, workspaces })
      if (workspaces.length === 1) await this.browse(workspaces[0]?.id ?? '')
    } catch (error) {
      if (signal.aborted || generation !== this.#generation) return
      this.#set({ ...snapshot, visible: true, loading: false, error: error instanceof Error ? error.message : String(error) })
    }
  }

  async browse(workspaceId: string, path?: string): Promise<void> {
    const { signal, generation } = this.#beginRequest()
    const { error: _error, ...snapshot } = this.#snapshot
    this.#set({ ...snapshot, visible: true, loading: true })
    try {
      const result = await this.rpc.call('/neuro-preview', 'browse', {
        workspaceId,
        ...(path === undefined ? {} : { path }),
      }, signal)
      if (generation !== this.#generation) return
      this.#set({
        ...snapshot,
        visible: true,
        loading: false,
        listing: resultValue<NeuroWorkspaceListing>(result),
      })
    } catch (error) {
      if (signal.aborted || generation !== this.#generation) return
      this.#set({ ...snapshot, visible: true, loading: false, error: error instanceof Error ? error.message : String(error) })
    }
  }

  showWorkspaceRoots(): void {
    const { listing: _listing, error: _error, ...snapshot } = this.#snapshot
    this.#set({ ...snapshot, visible: true })
  }

  hide(): void {
    this.#request?.abort()
    this.#generation += 1
    const datasetId = this.#snapshot.dataset?.datasetId
    this.#set(CLOSED)
    if (datasetId !== undefined) {
      void this.rpc.call('/neuro-preview', 'close', { datasetId }).catch(() => undefined)
    }
  }

  async open(path: string): Promise<void> {
    const previousId = this.#snapshot.dataset?.datasetId
    const { signal, generation } = this.#beginRequest()
    const { error: _error, ...snapshot } = this.#snapshot
    this.#set({ ...snapshot, visible: true, loading: true })
    try {
      const result = await this.rpc.call('/neuro-preview', 'open', { path }, signal)
      if (generation !== this.#generation) return
      const dataset = resultValue<WireInteractiveDataset>(result)
      this.#set({ ...snapshot, visible: true, loading: false, dataset, view: dataset.view })
      if (previousId !== undefined && previousId !== dataset.datasetId) {
        void this.rpc.call('/neuro-preview', 'close', { datasetId: previousId }).catch(() => undefined)
      }
    } catch (error) {
      if (signal.aborted || generation !== this.#generation) return
      this.#set({ ...snapshot, visible: true, loading: false, error: error instanceof Error ? error.message : String(error) })
    }
  }

  async view(cursor: VoxelCursor): Promise<void> {
    const dataset = this.#snapshot.dataset
    if (dataset === undefined) return
    const { signal, generation } = this.#beginRequest()
    const { error: _error, ...snapshot } = this.#snapshot
    this.#set({ ...snapshot, loading: true })
    const payload: InteractiveViewRequest = { datasetId: dataset.datasetId, ...cursor }
    try {
      const result = await this.rpc.call('/neuro-preview', 'view', payload, signal)
      if (generation !== this.#generation) return
      const view = resultValue<WireInteractivePreviewView>(result)
      this.#set({ ...this.#snapshot, loading: false, view })
    } catch (error) {
      if (signal.aborted || generation !== this.#generation) return
      this.#set({ ...this.#snapshot, loading: false, error: error instanceof Error ? error.message : String(error) })
    }
  }

  #beginRequest(): { signal: AbortSignal, generation: number } {
    this.#request?.abort()
    this.#request = new AbortController()
    this.#generation += 1
    return { signal: this.#request.signal, generation: this.#generation }
  }

  #set(snapshot: ViewerSnapshot): void {
    this.#snapshot = Object.freeze(snapshot)
    for (const listener of this.#listeners) listener()
  }
}
