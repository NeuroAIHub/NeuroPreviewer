# NeuroPreviewer

[![npm version](https://img.shields.io/npm/v/%40brainpilot%2Fdsh-neuro-previewer)](https://www.npmjs.com/package/@brainpilot/dsh-neuro-previewer)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![DSH plugin](https://img.shields.io/badge/DeepSeek%20Harness-plugin-5B5BD6)](https://github.com/deepseek-ai/deepseek-harness)

[English](README.md) | **简体中文**

> 为 DeepSeek Harness 构建的交互式神经科学数据查看器。

**NeuroPreviewer 是一个 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) 插件，不是独立桌面查看器。** 用户可以直接从 DSH 侧边栏打开 MPR 工作台，也可以从 `neuro_preview` 工具结果进入。Host 负责读取本地数据，浏览器只接收受限的预览切片和采样时间序列。

`@brainpilot/dsh-neuro-previewer` · [GitHub](https://github.com/NeuroAIHub/NeuroPreviewer) · [MIT License](LICENSE)

![NeuroPreviewer 多通道信号工作台](https://raw.githubusercontent.com/NeuroAIHub/NeuroPreviewer/main/design-demos/screenshots/dsh-signal-workbench.png)

> **版本状态：** npm `0.1.0` 是稳定的静态预览版本；多格式工作台目前位于 `main`，版本为 `0.2.0-alpha.5`，需要从源码安装。两者均面向 DSH `0.1.0-rc.6`；DSH 仍处于开发者预览阶段，后续可能存在破坏性变更。

## 当前能力

| 能力 | 状态 | 说明 |
| --- | --- | --- |
| DSH 直接入口 | ✅ alpha | 位于侧栏 New Session 下方、Workspaces 上方 |
| 工作区文件树 | ✅ alpha | 非遮罩小弹窗；文件夹原位展开并保留完整上级层级 |
| DSH 主题集成 | ✅ alpha | 使用 DSH 语义色、边框、字体、悬停状态与阴影 |
| 联动 MPR | ✅ alpha | axial、coronal、sagittal 三个切面共享同一体素光标 |
| 空间交互 | ✅ alpha | 点击任一切面，或移动 X/Y/Z 滑块 |
| 4D 时间交互 | ✅ alpha | 拖动、逐帧或播放 fMRI volume |
| 体素时间序列 | ✅ alpha | 绘制所选体素跨 volume 的变化，传输数量受限 |
| 多通道信号工作台 | ✅ alpha | 八条堆叠波形、可移动时间窗和通道翻页 |
| 对话入口 | ✅ | `neuro_preview` 返回预览卡片和工作台入口 |
| NIfTI-1 `.nii`、`.nii.gz` | ✅ | 3D MRI 与 4D fMRI；支持大小端及直接 gzip 解压 |
| EDF / EDF+ `.edf` | ✅ alpha | 带物理标定的 EEG/PSG 多通道波形，并对齐不同采样率 |
| BrainVision `.vhdr + .eeg` | ✅ alpha | multiplexed float32/int16/uint16；自动解析配套数据文件 |
| EEGLAB `.set + .fdt` | ✅ alpha | MATLAB v5 header 与外置 float32 信号 |
| NWB `.nwb` | ✅ 子集 | 将 `Units/spike_times` 显示为逐单元的分箱 spike-count 时间线 |
| 数值类型 | ✅ | `uint8/int8/int16/uint16/int32/uint32/float32/float64` |
| 强度处理 | ✅ | 应用 `scl_slope`/`scl_inter` 和 2%–98% 分位窗 |
| NIfTI-2 | 计划中 | header 与数据类型支持待实现 |
| BIDS JSON/TSV | 计划中 | sidecar、events 与数据集关系 |
| DICOM、FIF、CIFTI、GIFTI | 计划中 | DICOM 需要序列组装，其余格式需要新 Adapter |

图像目前遵循 voxel 存储顺序，尚未应用 qform/sform 解剖方向重排。NeuroPreviewer 仅适用于科研数据检查和开发测试，不能用于临床判读或诊断。

## 安装

### 环境要求

- Node.js `^22.19.0` 或 `>=24.0.0`
- npm 与 pnpm
- DeepSeek Harness `0.1.0-rc.6`

### npm 稳定版（静态预览）

```bash
dsh plugin --profile web add @brainpilot/dsh-neuro-previewer@0.1.0
dsh --profile web --dump-config
dsh --profile web
```

### 从源码安装交互 alpha

```bash
git clone https://github.com/NeuroAIHub/NeuroPreviewer.git
cd NeuroPreviewer
npm install
npm run check

dsh plugin --profile web add "$(pwd)"
dsh --profile web --dump-config
dsh --profile web
```

导出的配置应包含：

```yaml
- id: neuro-previewer
  name: '@brainpilot/dsh-neuro-previewer'
  config:
    maxFileBytes: 268435456
    maxSlicePixels: 4194304
    maxOpenDatasets: 2
    maxTimeSeriesPoints: 1024
```

## 使用交互工作台

1. 启动 DSH Web profile。
2. 点击 DSH 侧边栏中的 **NeuroPreviewer**。
3. 如果只注册了一个工作区，插件会直接进入其根目录；否则先选择工作区。
4. 在树中展开文件夹，选择支持的文件后点击 **Open viewer**，也可以双击；父级目录始终保留。
5. 对体数据点击切面或移动 X/Y/Z，并用时间控件浏览 4D volume。
6. 对信号数据移动时间窗、选择窗口时长，并翻阅不同通道组。

小弹窗不会添加覆盖整个页面的遮罩，DSH 主界面仍然可见。选择器会隐藏点号开头的目录和不支持的文件；高级用户仍可通过 **Open another host path…** 输入绝对路径。

对话触发 `neuro_preview` 后，也可以从结果卡片进入同一个查看器。对话只是可选入口，不是交互预览的前置条件。

`neuro_preview` 输入示例：

```json
{
  "path": "/absolute/path/to/image.nii",
  "axis": "axial",
  "index": 48,
  "volume": 0
}
```

没有 Web extension 时，工具仍会返回维度、体素大小、数据类型、位置、强度范围和警告的文本摘要。

## 架构

```text
DSH 侧边栏 ───────────────┐
                          ├──► Web 体数据 / 信号工作台
neuro_preview 结果卡片 ───┘          │
                                     │ loopback RPC：workspaces / browse / open / view / close
                                     ▼
                            InteractiveNeuroPreview
                              Host 受限数据缓存
                                     │
                                     ▼
                         格式 Adapter seam
                      ┌──────────────┴──────────────┐
                 NIfTI 体数据                 信号 Adapter
                                      EDF · BrainVision · EEGLAB · NWB
                                     ▼
                                   浏览器
```

交互格式位于统一的体数据/信号 seam 后面，主要模块边界如下：

- `src/core/nifti.ts`：校验 NIfTI-1，提取切片、体素值和时间序列。
- `src/core/edf.ts`、`brainvision.ts`、`eeglab.ts`、`nwb.ts`：生成受限信号窗口的格式 Adapter。
- `src/core/interactive.ts`：识别格式、管理受限数据集，并生成体数据或信号视图。
- `src/dsh/source.ts`：将 DSH `ctx.fs` 适配为有大小上限的二进制数据源。
- `src/dsh/rpc.ts`：暴露仅限 loopback 的 `open`、`view`、`close` 操作。
- `src/dsh/workspace-browser.ts`：列出工作区根目录，并过滤越界目录与支持的数据文件。
- `src/index.ts`：注册 Host 工具、配置和 RPC 服务。
- `src/client/workbench.tsx`：实现 DSH MPR 与多通道信号工作台。

## 使用真实神经科学数据测试

真实数据下载到 Git 忽略的 `test-data/real/`，不会进入仓库或 npm 包。下载文件通过 [scripts/real-data.sha256](scripts/real-data.sha256) 校验。

```bash
npm run data:download  # 完整语料约 190 MiB
npm run test:real
```

真实数据冒烟测试会解析 OpenNeuro T1/fMRI、PhysioNet EDF/EDF+、OpenNeuro BrainVision、EEGLAB `.set/.fdt` 和 DANDI NWB Units 表。来源、许可证、引用、隐私说明和哈希见 [docs/real-datasets.md](docs/real-datasets.md)。

## 开发与验证

```bash
npm run typecheck  # TypeScript 严格检查
npm test           # 解析器、MPR session、RPC、DSH 集成
npx playwright install chromium # 首次运行时安装测试浏览器
npm run test:design # 三个设计原型的浏览器交互检查
npm run test:real  # 真实体数据与信号格式冒烟测试
npm run build      # Host ESM 与 DSH Web client bundle
npm run check      # typecheck + unit tests + build
```

DSH 浏览器集成检查覆盖工作区逐级导航、直接打开、真实 4D 数据、联动空间位置、时间移动和所选体素曲线。设计探索与可复现浏览器检查位于 `design-demos/`；`verify-dsh-integration.cjs` 接受一个运行中的 DSH URL 和一个 NIfTI 绝对路径。

## 安全与资源限制

- 仅通过 DSH `ctx.fs` 只读访问文件。
- RPC 以 loopback authority 注册。
- Host 默认单文件上限 256 MiB，最多缓存两个打开的数据集。
- 单切片默认上限为 4,194,304 像素；时间序列默认最多传输 1,024 个样本。
- 浏览器接收三张归一化二维切片和受限时间序列，不接收完整体数据。
- 所有 header 派生的维度、偏移与乘法都会进行安全整数检查。
- 读取和视图请求支持取消；UI 会丢弃过期响应。
- DSH 当前文件系统没有 byte-range read，因此 Host 会完整读取符合限制的文件。

## 路线图

1. NIfTI-2 与 qform/sform 解剖方向重排。
2. 窗宽窗位、overlay、色图与键盘导航。
3. BIDS 数据集关系、JSON/TSV 表格和 events 时间线。
4. EDF+/BrainVision marker、annotation 与事件叠加。
5. 更广泛的 NWB acquisition group、DICOM 序列、MNE FIF、CIFTI 与 GIFTI。

## 许可

NeuroPreviewer 使用 [MIT License](LICENSE) 开源。真实测试数据仍受各自原始许可证、引用要求和隐私条款约束。
