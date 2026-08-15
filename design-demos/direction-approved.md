# Approved direction

## Directions shown

- A — Gallery Focus: `screenshots/direction-a.png`
- B — MPR Workbench: `screenshots/direction-b.png`
- C — Direct Manipulation: `screenshots/direction-c.png`

## User approval

User response: “好的”

Conversation context: the immediately preceding recommendation was “以 B 为主体，融合 C 的体素时间曲线” and asked the user to choose A, B, C, or “B+C”. The response is recorded as approval of the recommended B+C direction.

## Production direction

- Use B's simultaneous axial/coronal/sagittal MPR layout and linked crosshair.
- Add C's X/Y/Z/T direct controls and selected-voxel time-series plot.
- Opening a file should be a direct UI action. Conversation Tool calls remain an optional entry point that opens the same viewer state.

## Workspace picker iteration

User request on 2026-08-15: “好的，请你开始修改，也可以没有‘最近文件’，主要是用户可以一级一级选文件”. This is an iteration within the approved B+C direction: the sidebar launcher now opens a workspace-scoped, one-directory-at-a-time file picker without a recent-files surface.
