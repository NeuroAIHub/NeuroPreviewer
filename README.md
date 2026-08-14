# NeuroPreviewer — DeepSeek Harness 神经科学数据预览插件

**NeuroPreviewer 是一个 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) 插件**，不是独立的数据查看器。它以 DSH bundle + Web client plugin 的形式安装：模型通过 `neuro_preview` Tool 只读检查神经科学数据，DSH Web 客户端通过专用卡片显示二维灰度切片。

包名：`@neuroaihub/dsh-neuro-previewer` · GitHub：[NeuroAIHub/NeuroPreviewer](https://github.com/NeuroAIHub/NeuroPreviewer) · 许可证：[MIT](LICENSE)

> 当前状态：`0.1.0-alpha.1`。已经完成 NIfTI-1 的首个端到端纵切面；DSH 与本插件的公开接口仍可能在 RC/alpha 阶段变化。

## 当前能力

| 能力 | 状态 | 说明 |
| --- | --- | --- |
| NIfTI-1 单文件 `.nii` | ✅ | 校验 `sizeof_hdr=348` 与 `n+1` magic |
| 3D MRI | ✅ | axial、coronal、sagittal 三个切面 |
| 4D fMRI | ✅ | 可指定零基 `volume` |
| 数值类型 | ✅ | `uint8/int8/int16/uint16/int32/uint32/float32/float64` |
| 强度处理 | ✅ | 应用 `scl_slope`/`scl_inter`，使用 2%–98% 分位窗 |
| 大小端 | ✅ | little-endian 与 big-endian |
| DSH Web 卡片 | ✅ | Canvas 灰度图、维度、类型、切面与强度范围 |
| `.nii.gz`、NIfTI-2 | ⏳ | 已准备真实样本，尚未在插件内解压/解析 |
| BIDS 元数据、CSV/TSV | ⏳ | 真实 BIDS sidecar 和 events 已下载 |
| EDF/EDF+、BrainVision、EEGLAB | ⏳ | 真实 EEG/PSG 样本已下载，Adapter 待实现 |
| NWB、FIF | ⏳ | 计划通过可选 Python Worker 支持 |

当前显示遵循 voxel 存储顺序，尚未根据 qform/sform 做解剖方向重排。因此它适合数据检查和开发测试，不能替代临床阅片软件。

## 快速开始

### 环境要求

- Node.js 22 或更高版本
- npm
- DeepSeek Harness `0.1.0-rc.6`
- 使用 `dsh plugin` 时，PATH 中需要 `pnpm`

### 构建

```bash
git clone https://github.com/NeuroAIHub/NeuroPreviewer.git
cd NeuroPreviewer
npm install
npm run check
```

### 安装到 DSH Web profile

从 npm 安装发布版本：

```bash
dsh plugin --profile web add @neuroaihub/dsh-neuro-previewer@0.1.0-alpha.1
dsh --profile web --dump-config
dsh --profile web
```

从本地 checkout 安装开发版本：

```bash
dsh plugin --profile web add "$(pwd)"
dsh --profile web --dump-config
dsh --profile web
```

`--dump-config` 中应出现：

```yaml
- id: neuro-previewer
  name: '@neuroaihub/dsh-neuro-previewer'
  config:
    maxFileBytes: 268435456
    maxSlicePixels: 4194304
```

## 使用 `neuro_preview`

模型侧 Tool 参数：

```json
{
  "path": "/absolute/path/to/image.nii",
  "axis": "axial",
  "index": 48,
  "volume": 0
}
```

| 参数 | 必需 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `path` | 是 | — | DSH 文件系统可访问的 `.nii` 路径 |
| `axis` | 否 | `axial` | `axial`、`coronal` 或 `sagittal` |
| `index` | 否 | 中央切片 | 零基切片序号 |
| `volume` | 否 | `0` | 4D 数据的零基 volume 序号 |

无 Web 客户端时，Tool 仍会返回维度、体素大小、数据类型、切片位置、强度范围和警告等文本摘要。

## 真实神经科学数据

真实数据不提交到 Git，也不进入 npm 包。下载脚本将它们保存到被 `.gitignore` 排除的 `test-data/real/`，并用 [scripts/real-data.sha256](scripts/real-data.sha256) 校验。

下载全部样本，约 190 MiB：

```bash
npm run data:download
```

也可以按格式下载：

```bash
bash scripts/download-real-data.sh nifti
bash scripts/download-real-data.sh edf
bash scripts/download-real-data.sh brainvision
bash scripts/download-real-data.sh eeglab
bash scripts/download-real-data.sh nwb
```

本地语料覆盖：

| 数据源 | 领域与格式 | 本地内容 | 当前可预览 |
| --- | --- | --- | --- |
| OpenNeuro `ds000005` | 人类结构 MRI、任务 fMRI；BIDS/NIfTI | 3D T1、240-volume BOLD、JSON/TSV；同时保留 `.nii.gz` 和解压后的 `.nii` | ✅ 两个 `.nii` |
| PhysioNet Sleep-EDF Expanded | 人类睡眠 EEG/PSG；EDF+ | PSG 与 Hypnogram | ❌ Adapter 待实现 |
| PhysioNet EEGMMIDB | 人类运动想象 EEG；EDF+ | 64 通道基线记录 | ❌ Adapter 待实现 |
| OpenNeuro `ds007629` | 人类自然阅读 EEG；BrainVision | `.vhdr/.vmrk/.eeg` 三件套 | ❌ Adapter 待实现 |
| EEGLAB 官方 sample data | 人类 EEG；`.set/.fdt` 与 BrainVision | EEGLAB 数据对及小型 BrainVision 回归样本 | ❌ Adapter 待实现 |
| DANDI `000006` | 小鼠 ALM 细胞外电生理；NWB | 两个小型 `.nwb` session | ❌ Python Worker 待实现 |

数据集的固定下载地址、许可、引用、隐私说明和逐文件哈希见 [docs/real-datasets.md](docs/real-datasets.md)。人类数据虽然已公开或去标识化，仍不得尝试重识别。

### 使用真实数据冒烟测试

先构建并下载数据：

```bash
npm run build
npm run data:download
npm run test:real
```

当前真实数据测试会解析：

- `sub-01_T1w.nii`：`160 × 192 × 192`、`int16`、真实 3D T1。
- `sub-01_task-mixedgamblestask_run-01_bold.nii`：`64 × 64 × 34 × 240`、`int16`、真实 4D fMRI，并读取 `volume=1`。

这两个文件已经在本仓库当前实现上通过三维/四维解析和切片生成。其他格式当前作为明确的“不支持”语料保留，避免用合成文件掩盖未来 Adapter 的真实兼容问题。

## 测试

```bash
npm run typecheck  # TypeScript 严格类型检查
npm test           # 合成 fixture 单元/契约测试
npm run test:real  # 本地真实 NIfTI 冒烟测试
npm run build      # Host ESM 与 DSH Client bundle
npm run check      # typecheck + unit tests + build
```

合成测试覆盖：

- NIfTI magic、header 长度与截断数据。
- little/big endian。
- 三个切面和 4D volume。
- slope/intercept。
- 非法 index、切片像素上限和提前取消。
- DSH Tool 注册、文件系统 Adapter、模型文本输出和 Client presentation metadata。

## 架构

```text
DSH neuro_preview Tool
        │
        ▼
NeuroPreview Interface
        │
        ├── NIfTI Adapter（当前）
        ├── EDF / BrainVision Adapter（计划）
        └── Python Worker Adapter（计划：NWB/FIF/EEGLAB）
        │
        ▼
统一 PreviewDocument
        │
        ▼
DSH Web NeuroPreviewRow + Canvas
```

核心 Module 与 DSH Adapter 分离：

- `src/core/preview.ts`：格式中立的 `NeuroPreview` Interface。
- `src/core/nifti.ts`：NIfTI-1 检测、解析与切片。
- `src/dsh/source.ts`：把 DSH `ctx.fs` 转换成受限 `BinarySource`。
- `src/index.ts`：Host Tool 注册与模型输出。
- `src/client.tsx`：DSH Web 自定义 Tool 卡片。

## 安全与资源限制

- 仅通过 DSH `ctx.fs` 进行只读访问。
- 默认单文件上限 256 MiB。
- 默认单切片上限 4,194,304 像素。
- 所有 header 派生的维度、偏移和乘法都进行安全整数检查。
- 解析支持 `AbortSignal`。
- 浏览器仅接收归一化后的单张灰度切片，不接收完整体数据。
- DSH 当前文件系统 Interface 没有 byte-range read，因此 alpha 版 Host 会在上限内读取完整文件。

## 路线图

1. `.nii.gz`、NIfTI-2、qform/sform 解剖方向和交互式切片 session。
2. BIDS 数据集关联、JSON/TSV 表格和 events 时间线。
3. EDF/EDF+ 与 BrainVision 多通道波形和 marker。
4. EEGLAB `.set/.fdt`。
5. 可选 Python Worker：NWB、MNE FIF、CIFTI/GIFTI。

## 许可

NeuroPreviewer 插件代码使用 [MIT License](LICENSE)。真实测试数据不随代码再分发，各自保留原始数据源的许可、引用和隐私约束；下载即表示使用者自行遵守相应条款。
