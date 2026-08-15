import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { NeuroViewerController } from './client/controller.js'
import { NeuroPreviewRow } from './client/tool-row.js'
import { NeuroPreviewSidebarEntry, NeuroWorkbench } from './client/workbench.js'

export const inject = ['slots', 'connection']

export function apply(ctx: ClientContext): void {
  const clientRpc = ctx.connection.rpc as unknown as ClientConnectionRpc
  const controller = new NeuroViewerController(clientRpc)
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
    { name: 'tool.call.toolview', key: 'neuro_preview' },
    (props: ToolCallViewProps) => <NeuroPreviewRow {...props} controller={controller} />,
  ))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'neuro-previewer-workbench', order: 100, label: 'NeuroPreviewer' },
    () => <NeuroWorkbench controller={controller} />,
  ))
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register(
    { name: 'sidebar.footer.action', id: 'neuro-previewer', order: 70, label: 'NeuroPreviewer' },
    ({ wide }: SidebarFooterActionOwnerProps) => <NeuroPreviewSidebarEntry wide={wide} controller={controller} />,
  ))
}
