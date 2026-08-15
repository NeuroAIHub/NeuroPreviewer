import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-workspace'
import type {
  NeuroWorkspaceEntry,
  NeuroWorkspaceListing,
  NeuroWorkspaceSummary,
} from '../core/types.js'

export interface WorkspaceFileBrowserOptions {
  readonly maxEntries?: number
  readonly supportedExtensions?: readonly string[]
}

function positiveInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer`)
  return value
}

function summary(workspace: { id: string, title: string, path: string }): NeuroWorkspaceSummary {
  return { id: workspace.id, title: workspace.title, path: workspace.path }
}

/**
 * Host-side workspace browser. It owns workspace containment, file filtering,
 * hidden-entry policy, and result bounds behind two small read-only methods.
 */
export class WorkspaceFileBrowser {
  readonly #maxEntries: number
  readonly #supportedExtensions: readonly string[]

  constructor(
    private readonly ctx: Context,
    options: WorkspaceFileBrowserOptions = {},
  ) {
    this.#maxEntries = positiveInteger(options.maxEntries ?? 2_000, 'maxEntries')
    this.#supportedExtensions = (options.supportedExtensions ?? ['.nii'])
      .map(extension => extension.toLocaleLowerCase())
  }

  roots(): readonly NeuroWorkspaceSummary[] {
    return this.ctx.workspaceRegistry.list().map(summary)
  }

  async list(workspaceId: string, path?: string, signal?: AbortSignal): Promise<NeuroWorkspaceListing> {
    const workspace = this.ctx.workspaceRegistry.list().find(candidate => candidate.id === workspaceId)
    if (workspace === undefined) throw new Error(`Workspace is not registered: ${workspaceId}`)
    if (await workspace.status() !== 'ok') throw new Error(`Workspace directory is unavailable: ${workspace.path}`)

    const root = await this.ctx.fs.resolve(workspace.path, signal === undefined ? undefined : { signal })
    const target = path === undefined
      ? root
      : await this.ctx.fs.resolve(path, signal === undefined ? undefined : { signal })
    if (!this.ctx.fs.contains(root, target)) throw new Error('Requested directory is outside the selected workspace')
    const info = await this.ctx.fs.stat(target, signal)
    if (info === undefined || info.type !== 'directory') throw new Error('Requested workspace path is not a directory')

    const children = await this.ctx.fs.listDir(target, signal)
    const entries: NeuroWorkspaceEntry[] = []
    for (const child of children) {
      if (entries.length >= this.#maxEntries) break
      if (child.name.startsWith('.') || !this.ctx.fs.contains(root, child.target)) continue
      if (child.type === 'directory') {
        entries.push({ name: child.name, path: child.target.displayPath, type: 'directory' })
        continue
      }
      if (child.type !== 'file' || !this.#supported(child.name)) continue
      entries.push({
        name: child.name,
        path: child.target.displayPath,
        type: 'file',
        ...(child.size === undefined ? {} : { size: child.size }),
      })
    }
    entries.sort((left, right) => left.type === right.type
      ? left.name.localeCompare(right.name)
      : left.type === 'directory' ? -1 : 1)
    return { workspace: summary(workspace), path: target.displayPath, entries }
  }

  #supported(name: string): boolean {
    const lower = name.toLocaleLowerCase()
    return this.#supportedExtensions.some(extension => lower.endsWith(extension))
  }
}
