import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { WorkspaceFileBrowser } from '../src/dsh/workspace-browser.js'

function target(displayPath: string) {
  return { targetKey: displayPath, displayPath }
}

describe('WorkspaceFileBrowser', () => {
  it('lists registered roots and only supported entries contained by the workspace', async () => {
    const workspace = {
      id: 'workspace-1',
      title: 'Study',
      path: '/study',
      async status() { return 'ok' as const },
    }
    const ctx = {
      workspaceRegistry: { list: () => [workspace] },
      fs: {
        async resolve(path: string) { return target(path) },
        contains(parent: { displayPath: string }, child: { displayPath: string }) {
          return child.displayPath === parent.displayPath || child.displayPath.startsWith(`${parent.displayPath}/`)
        },
        async stat() { return { type: 'directory', version: 'v1' } },
        async listDir() {
          return [
            { name: 'sub-01', type: 'directory', target: target('/study/sub-01') },
            { name: 'brain.nii', type: 'file', size: 42, target: target('/study/brain.nii') },
            { name: 'compressed.nii.gz', type: 'file', target: target('/study/compressed.nii.gz') },
            { name: 'recording.edf', type: 'file', target: target('/study/recording.edf') },
            { name: 'recording.vhdr', type: 'file', target: target('/study/recording.vhdr') },
            { name: 'session.set', type: 'file', target: target('/study/session.set') },
            { name: 'units.nwb', type: 'file', target: target('/study/units.nwb') },
            { name: 'events.tsv', type: 'file', target: target('/study/events.tsv') },
            { name: '.cache', type: 'directory', target: target('/study/.cache') },
            { name: 'escape', type: 'directory', target: target('/outside') },
          ]
        },
      },
    } as unknown as Context
    const browser = new WorkspaceFileBrowser(ctx)

    expect(browser.roots()).toEqual([{ id: 'workspace-1', title: 'Study', path: '/study' }])
    await expect(browser.list('workspace-1')).resolves.toEqual({
      workspace: { id: 'workspace-1', title: 'Study', path: '/study' },
      path: '/study',
      entries: [
        { name: 'sub-01', path: '/study/sub-01', type: 'directory' },
        { name: 'brain.nii', path: '/study/brain.nii', type: 'file', size: 42 },
        { name: 'compressed.nii.gz', path: '/study/compressed.nii.gz', type: 'file' },
        { name: 'recording.edf', path: '/study/recording.edf', type: 'file' },
        { name: 'recording.vhdr', path: '/study/recording.vhdr', type: 'file' },
        { name: 'session.set', path: '/study/session.set', type: 'file' },
        { name: 'units.nwb', path: '/study/units.nwb', type: 'file' },
      ],
    })
  })

  it('rejects browsing outside the selected workspace', async () => {
    const ctx = {
      workspaceRegistry: { list: () => [{ id: 'w', title: 'W', path: '/w', async status() { return 'ok' as const } }] },
      fs: {
        async resolve(path: string) { return target(path) },
        contains(parent: { displayPath: string }, child: { displayPath: string }) {
          return child.displayPath === parent.displayPath || child.displayPath.startsWith(`${parent.displayPath}/`)
        },
      },
    } as unknown as Context
    await expect(new WorkspaceFileBrowser(ctx).list('w', '/other')).rejects.toThrow(/outside/)
  })
})
