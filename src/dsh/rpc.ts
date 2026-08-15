import { Buffer } from 'node:buffer'
import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-client-connection'
import { NeuroPreviewError } from '../core/nifti.js'
import type { InteractiveNeuroPreview } from '../core/interactive.js'
import type { WorkspaceFileBrowser } from './workspace-browser.js'
import type {
  AnyInteractivePreviewView,
  AnyInteractiveViewRequest,
  InteractivePreviewView,
  VoxelCursor,
  WireImage2DFrame,
  WireInteractiveDataset,
  WireInteractivePreviewView,
} from '../core/types.js'

const CHANNEL = '/neuro-preview'

function wireFrame(frame: InteractivePreviewView['frames']['axial']): WireImage2DFrame {
  const { pixels, ...rest } = frame
  return { ...rest, pixelsBase64: Buffer.from(pixels).toString('base64') }
}

function wireView(view: AnyInteractivePreviewView): WireInteractivePreviewView | AnyInteractivePreviewView {
  if (!('frames' in view)) return view
  return {
    ...view,
    frames: {
      axial: wireFrame(view.frames.axial),
      coronal: wireFrame(view.frames.coronal),
      sagittal: wireFrame(view.frames.sagittal),
    },
  }
}

function badRequest(message: string) {
  return {
    ok: false as const,
    error: { code: 'bad-request' as const, message, details: { issues: [] } },
  }
}

function internalError(message: string) {
  return {
    ok: false as const,
    error: { code: 'internal' as const, message, details: {} },
  }
}

function cancelled(message: string) {
  return {
    ok: false as const,
    error: { code: 'cancelled' as const, message, details: {} },
  }
}

function objectPayload(payload: unknown): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new NeuroPreviewError('request payload must be an object', 'INVALID_REQUEST')
  }
  return payload as Record<string, unknown>
}

function requiredString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new NeuroPreviewError(`${key} must be a non-empty string`, 'INVALID_REQUEST')
  }
  return value
}

function requiredInteger(payload: Record<string, unknown>, key: string): number {
  const value = payload[key]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new NeuroPreviewError(`${key} must be a non-negative integer`, 'INVALID_REQUEST')
  }
  return value
}

export function createNeuroPreviewRpcHandler(
  preview: InteractiveNeuroPreview,
  workspaceBrowser?: WorkspaceFileBrowser,
): ConnectionRpcHandler {
  return async (endpoint, rawPayload, signal) => {
    try {
      const payload = objectPayload(rawPayload)
      if (endpoint === 'workspaces') {
        if (workspaceBrowser === undefined) return internalError('Workspace browser is unavailable')
        return { ok: true, value: workspaceBrowser.roots() }
      }
      if (endpoint === 'browse') {
        if (workspaceBrowser === undefined) return internalError('Workspace browser is unavailable')
        const rawPath = payload.path
        if (rawPath !== undefined && typeof rawPath !== 'string') {
          throw new NeuroPreviewError('path must be a string when provided', 'INVALID_REQUEST')
        }
        return {
          ok: true,
          value: await workspaceBrowser.list(
            requiredString(payload, 'workspaceId'),
            rawPath,
            signal,
          ),
        }
      }
      if (endpoint === 'open') {
        const opened = await preview.open(requiredString(payload, 'path'), signal)
        const value: WireInteractiveDataset = opened.kind === 'signals'
          ? opened
          : { ...opened, view: wireView(opened.view) as WireInteractivePreviewView }
        return { ok: true, value }
      }
      if (endpoint === 'view') {
        const datasetId = requiredString(payload, 'datasetId')
        const request: AnyInteractiveViewRequest = payload.startSample === undefined
          ? {
              datasetId,
              x: requiredInteger(payload, 'x'),
              y: requiredInteger(payload, 'y'),
              z: requiredInteger(payload, 'z'),
              volume: requiredInteger(payload, 'volume'),
            }
          : {
              datasetId,
              startSample: requiredInteger(payload, 'startSample'),
              windowSamples: requiredInteger(payload, 'windowSamples'),
              channelStart: requiredInteger(payload, 'channelStart'),
              channelCount: requiredInteger(payload, 'channelCount'),
            }
        return { ok: true, value: wireView(preview.view(request)) }
      }
      if (endpoint === 'close') {
        return { ok: true, value: { closed: preview.close(requiredString(payload, 'datasetId')) } }
      }
      return badRequest(`Unknown NeuroPreviewer endpoint: ${endpoint}`)
    } catch (error) {
      if (signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        return cancelled('NeuroPreviewer request was cancelled')
      }
      if (error instanceof NeuroPreviewError) return badRequest(error.message)
      return internalError(error instanceof Error ? error.message : String(error))
    }
  }
}

export function registerNeuroPreviewRpc(
  ctx: Context,
  preview: InteractiveNeuroPreview,
  workspaceBrowser: WorkspaceFileBrowser,
): void {
  const handler = createNeuroPreviewRpcHandler(preview, workspaceBrowser)
  ctx.inject(['connection'], connectionCtx => connectionCtx.connection.rpc.handle(
    CHANNEL,
    handler,
    { authority: 'loopback' },
  ))
}
