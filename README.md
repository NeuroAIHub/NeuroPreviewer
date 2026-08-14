# NeuroPreviewer

> Preview neuroscience data directly inside DeepSeek Harness.

[English](#english) · [中文](#中文)

**NeuroPreviewer is a neuroscience data preview plugin for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness).** It is installed as a DSH bundle with a Web client extension—not as a standalone viewer. The model inspects local data through the read-only `neuro_preview` tool, while the DSH Web client renders the result as a dedicated preview card.

**NeuroPreviewer 是一个面向 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) 的神经科学数据预览插件。** 它以 DSH bundle 和 Web client extension 的形式安装，并非独立查看器。模型通过只读的 `neuro_preview` 工具检查本地数据，DSH Web 客户端则使用专用卡片呈现预览结果。

`@neuroaihub/dsh-neuro-previewer` · [GitHub](https://github.com/NeuroAIHub/NeuroPreviewer) · [MIT License](LICENSE)

> **Alpha status / Alpha 状态:** `0.1.0-alpha.1` currently provides the first end-to-end NIfTI-1 workflow. Both DSH and this plugin may introduce breaking changes while their public interfaces remain in RC/alpha.

---

## English

### Why NeuroPreviewer?

NeuroPreviewer gives a DSH agent a safe, compact way to answer basic questions about a neuroscience file without sending the full dataset to the browser. The Host plugin reads and validates the file through DSH's filesystem interface, creates a bounded 2D preview, and returns structured metadata plus a Web-friendly grayscale frame.

Current priorities are reproducibility, explicit resource limits, and graceful text output when the Web client is unavailable.

### Current capabilities

| Capability | Status | Details |
| --- | --- | --- |
| Single-file NIfTI-1 `.nii` | ✅ | Validates `sizeof_hdr=348` and the `n+1` magic |
| 3D MRI | ✅ | Axial, coronal, and sagittal slices |
| 4D fMRI | ✅ | Selectable zero-based `volume` |
| Numeric data | ✅ | `uint8/int8/int16/uint16/int32/uint32/float32/float64` |
| Intensity processing | ✅ | Applies `scl_slope`/`scl_inter` and a 2%–98% percentile window |
| Endianness | ✅ | Little-endian and big-endian files |
| DSH Web preview card | ✅ | Canvas image, dimensions, datatype, plane, and intensity range |
| `.nii.gz` and NIfTI-2 | Planned | Real fixtures are available; decompression/parsing is not implemented yet |
| BIDS metadata and CSV/TSV | Planned | Real BIDS sidecars and events files are available |
| EDF/EDF+, BrainVision, EEGLAB | Planned | Real EEG/PSG fixtures are available; adapters are pending |
| NWB and FIF | Planned | Intended for an optional Python worker |

The current renderer follows voxel storage order and does not yet reorient images using qform/sform. NeuroPreviewer is intended for research-data inspection and development—not clinical interpretation or diagnosis.

### Quick start

#### Requirements

- Node.js `^22.19.0` or `>=24.0.0`
- npm and pnpm
- DeepSeek Harness `0.1.0-rc.6`

#### Build and install from source

```bash
git clone https://github.com/NeuroAIHub/NeuroPreviewer.git
cd NeuroPreviewer
npm install
npm run check

dsh plugin --profile web add "$(pwd)"
dsh --profile web --dump-config
dsh --profile web
```

Once the package is published to npm, it can be installed with:

```bash
dsh plugin --profile web add @neuroaihub/dsh-neuro-previewer@0.1.0-alpha.1
dsh --profile web --dump-config
dsh --profile web
```

The dumped configuration should include:

```yaml
- id: neuro-previewer
  name: '@neuroaihub/dsh-neuro-previewer'
  config:
    maxFileBytes: 268435456
    maxSlicePixels: 4194304
```

### Using `neuro_preview`

Example tool input:

```json
{
  "path": "/absolute/path/to/image.nii",
  "axis": "axial",
  "index": 48,
  "volume": 0
}
```

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `path` | Yes | — | Path to a `.nii` file accessible through the DSH filesystem |
| `axis` | No | `axial` | `axial`, `coronal`, or `sagittal` |
| `index` | No | Middle slice | Zero-based slice index |
| `volume` | No | `0` | Zero-based volume index for 4D data |

Without the Web extension, the tool still returns a text summary containing dimensions, voxel size, datatype, slice position, intensity range, and warnings.

### Testing with real neuroscience data

Real datasets are downloaded to the gitignored `test-data/real/` directory and are never included in the repository or npm package. Every downloaded file is checked against [scripts/real-data.sha256](scripts/real-data.sha256).

Download the complete corpus—approximately 190 MiB—and run the real-data smoke test:

```bash
npm run data:download
npm run test:real
```

Individual format groups can also be downloaded:

```bash
bash scripts/download-real-data.sh nifti
bash scripts/download-real-data.sh edf
bash scripts/download-real-data.sh brainvision
bash scripts/download-real-data.sh eeglab
bash scripts/download-real-data.sh nwb
```

| Source | Domain and format | Local fixtures | Preview support |
| --- | --- | --- | --- |
| OpenNeuro `ds000005` | Human structural MRI and task fMRI; BIDS/NIfTI | 3D T1, 240-volume BOLD, JSON/TSV, compressed and uncompressed NIfTI | ✅ Two `.nii` files |
| PhysioNet Sleep-EDF Expanded | Human sleep EEG/PSG; EDF+ | PSG and Hypnogram | Adapter pending |
| PhysioNet EEGMMIDB | Human motor-imagery EEG; EDF+ | 64-channel baseline recording | Adapter pending |
| OpenNeuro `ds007629` | Human natural-reading EEG; BrainVision | `.vhdr/.vmrk/.eeg` triplet | Adapter pending |
| EEGLAB sample data | Human EEG; `.set/.fdt` and BrainVision | EEGLAB pair and a compact BrainVision regression sample | Adapter pending |
| DANDI `000006` | Mouse ALM extracellular electrophysiology; NWB | Two compact `.nwb` sessions | Python worker pending |

The current smoke test parses a real `160 × 192 × 192` 3D T1 image and a real `64 × 64 × 34 × 240` 4D fMRI image. Unsupported formats remain in the corpus as explicit negative fixtures so future adapters are tested against real files rather than synthetic substitutes.

See [docs/real-datasets.md](docs/real-datasets.md) for pinned download URLs, licenses, citations, privacy notes, and per-file hashes. Public or de-identified human data must never be used for re-identification attempts.

### Development and verification

```bash
npm run typecheck  # Strict TypeScript checking
npm test           # Synthetic unit and contract tests
npm run test:real  # Smoke tests against locally downloaded real NIfTI data
npm run build      # Host ESM and DSH Web client bundles
npm run check      # typecheck + unit tests + build
```

The synthetic suite covers header validation, truncated inputs, little/big endian data, all three slice planes, 4D volumes, slope/intercept scaling, invalid indices, pixel limits, cancellation, DSH tool registration, filesystem adaptation, text output, and client presentation metadata.

### Architecture

```text
DSH neuro_preview Tool
        │
        ▼
NeuroPreview Interface
        │
        ├── NIfTI Adapter (current)
        ├── EDF / BrainVision Adapters (planned)
        └── Python Worker Adapter (planned: NWB/FIF/EEGLAB)
        │
        ▼
Unified PreviewDocument
        │
        ▼
DSH Web NeuroPreviewRow + Canvas
```

The format-neutral core is kept separate from the DSH integration:

- `src/core/preview.ts` defines the `NeuroPreview` interface.
- `src/core/nifti.ts` detects and parses NIfTI-1 files and extracts slices.
- `src/dsh/source.ts` adapts DSH `ctx.fs` into a bounded `BinarySource`.
- `src/index.ts` registers the Host tool and model-facing output.
- `src/client.tsx` implements the DSH Web tool card.

### Safety and resource limits

- File access is read-only and goes exclusively through DSH `ctx.fs`.
- The default maximum file size is 256 MiB.
- The default maximum slice size is 4,194,304 pixels.
- Header-derived dimensions, offsets, and multiplications are checked as safe integers.
- Parsing supports `AbortSignal` cancellation.
- The browser receives one normalized grayscale slice, never the complete volume.
- Because the current DSH filesystem interface has no byte-range read, the alpha Host reads the full file within the configured size limit.

### Roadmap

1. `.nii.gz`, NIfTI-2, qform/sform reorientation, and interactive slice sessions.
2. BIDS dataset relationships, JSON/TSV tables, and event timelines.
3. EDF/EDF+ and BrainVision multichannel waveforms and markers.
4. EEGLAB `.set/.fdt` support.
5. Optional Python worker for NWB, MNE FIF, CIFTI, and GIFTI.

---

## 中文

### 为什么选择 NeuroPreviewer？

NeuroPreviewer 让 DSH 智能体能够安全、轻量地了解神经科学文件的基本信息，而不必把完整数据集发送到浏览器。Host 插件通过 DSH 文件系统接口读取并校验文件，在明确的资源上限内生成二维预览，再返回结构化元数据和适合 Web 显示的灰度图像。

当前版本优先保证可复现性、明确的资源限制，以及 Web 客户端不可用时仍然有效的文本输出。

### 当前能力

| 能力 | 状态 | 说明 |
| --- | --- | --- |
| NIfTI-1 单文件 `.nii` | ✅ | 校验 `sizeof_hdr=348` 与 `n+1` magic |
| 3D MRI | ✅ | axial、coronal、sagittal 三个切面 |
| 4D fMRI | ✅ | 可指定零基 `volume` |
| 数值类型 | ✅ | `uint8/int8/int16/uint16/int32/uint32/float32/float64` |
| 强度处理 | ✅ | 应用 `scl_slope`/`scl_inter`，使用 2%–98% 分位窗 |
| 大小端 | ✅ | little-endian 与 big-endian |
| DSH Web 预览卡片 | ✅ | Canvas 灰度图、维度、类型、切面和强度范围 |
| `.nii.gz`、NIfTI-2 | 计划中 | 已准备真实样本，尚未实现解压与解析 |
| BIDS 元数据、CSV/TSV | 计划中 | 已准备真实 BIDS sidecar 和 events 文件 |
| EDF/EDF+、BrainVision、EEGLAB | 计划中 | 已准备真实 EEG/PSG 样本，Adapter 待实现 |
| NWB、FIF | 计划中 | 计划通过可选 Python Worker 支持 |

当前渲染遵循 voxel 存储顺序，尚未根据 qform/sform 重新排列解剖方向。NeuroPreviewer 适用于科研数据检查和开发测试，不能用于临床判读或诊断。

### 快速开始

#### 环境要求

- Node.js `^22.19.0` 或 `>=24.0.0`
- npm 与 pnpm
- DeepSeek Harness `0.1.0-rc.6`

#### 从源码构建并安装

```bash
git clone https://github.com/NeuroAIHub/NeuroPreviewer.git
cd NeuroPreviewer
npm install
npm run check

dsh plugin --profile web add "$(pwd)"
dsh --profile web --dump-config
dsh --profile web
```

npm 包正式发布后，可以这样安装：

```bash
dsh plugin --profile web add @neuroaihub/dsh-neuro-previewer@0.1.0-alpha.1
dsh --profile web --dump-config
dsh --profile web
```

导出的配置中应当包含：

```yaml
- id: neuro-previewer
  name: '@neuroaihub/dsh-neuro-previewer'
  config:
    maxFileBytes: 268435456
    maxSlicePixels: 4194304
```

### 使用 `neuro_preview`

工具调用示例：

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
| `path` | 是 | — | DSH 文件系统可访问的 `.nii` 文件路径 |
| `axis` | 否 | `axial` | `axial`、`coronal` 或 `sagittal` |
| `index` | 否 | 中央切片 | 零基切片序号 |
| `volume` | 否 | `0` | 4D 数据的零基 volume 序号 |

即使没有 Web extension，工具仍会返回文本摘要，包括维度、体素大小、数据类型、切片位置、强度范围和警告。

### 使用真实神经科学数据测试

真实数据会下载到已被 Git 忽略的 `test-data/real/`，不会进入代码仓库或 npm 包。所有下载文件都会通过 [scripts/real-data.sha256](scripts/real-data.sha256) 校验。

下载完整语料库（约 190 MiB）并执行真实数据冒烟测试：

```bash
npm run data:download
npm run test:real
```

也可以按格式分别下载：

```bash
bash scripts/download-real-data.sh nifti
bash scripts/download-real-data.sh edf
bash scripts/download-real-data.sh brainvision
bash scripts/download-real-data.sh eeglab
bash scripts/download-real-data.sh nwb
```

| 数据源 | 领域与格式 | 本地测试数据 | 当前支持 |
| --- | --- | --- | --- |
| OpenNeuro `ds000005` | 人类结构 MRI、任务 fMRI；BIDS/NIfTI | 3D T1、240-volume BOLD、JSON/TSV、压缩与解压 NIfTI | ✅ 两个 `.nii` 文件 |
| PhysioNet Sleep-EDF Expanded | 人类睡眠 EEG/PSG；EDF+ | PSG 与 Hypnogram | Adapter 待实现 |
| PhysioNet EEGMMIDB | 人类运动想象 EEG；EDF+ | 64 通道基线记录 | Adapter 待实现 |
| OpenNeuro `ds007629` | 人类自然阅读 EEG；BrainVision | `.vhdr/.vmrk/.eeg` 三件套 | Adapter 待实现 |
| EEGLAB sample data | 人类 EEG；`.set/.fdt` 与 BrainVision | EEGLAB 数据对与小型 BrainVision 回归样本 | Adapter 待实现 |
| DANDI `000006` | 小鼠 ALM 细胞外电生理；NWB | 两个小型 `.nwb` session | Python Worker 待实现 |

当前冒烟测试会解析真实的 `160 × 192 × 192` 3D T1 图像，以及真实的 `64 × 64 × 34 × 240` 4D fMRI 图像。尚未支持的格式会作为明确的负向语料保留，确保未来 Adapter 面对的是真实文件，而不是掩盖兼容问题的合成替代品。

固定下载地址、许可证、引用、隐私说明和逐文件哈希见 [docs/real-datasets.md](docs/real-datasets.md)。即使人类数据已经公开或去标识化，也不得尝试重新识别数据主体。

### 开发与验证

```bash
npm run typecheck  # TypeScript 严格类型检查
npm test           # 合成 fixture 单元测试与契约测试
npm run test:real  # 使用本地真实 NIfTI 数据进行冒烟测试
npm run build      # 构建 Host ESM 与 DSH Web client bundle
npm run check      # typecheck + unit tests + build
```

合成测试覆盖 header 校验、截断输入、little/big endian、三个切面、4D volume、slope/intercept、非法 index、切片像素上限、提前取消、DSH Tool 注册、文件系统 Adapter、模型文本输出和 Client presentation metadata。

### 架构

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

格式中立的核心模块与 DSH 集成相互分离：

- `src/core/preview.ts`：定义 `NeuroPreview` 接口。
- `src/core/nifti.ts`：检测、解析 NIfTI-1 文件并提取切片。
- `src/dsh/source.ts`：将 DSH `ctx.fs` 转换为受限的 `BinarySource`。
- `src/index.ts`：注册 Host 工具及面向模型的输出。
- `src/client.tsx`：实现 DSH Web 工具卡片。

### 安全与资源限制

- 仅通过 DSH `ctx.fs` 进行只读文件访问。
- 默认单文件上限为 256 MiB。
- 默认单切片上限为 4,194,304 像素。
- 所有由 header 派生的维度、偏移和乘法都会进行安全整数检查。
- 解析支持通过 `AbortSignal` 取消。
- 浏览器仅接收一张归一化灰度切片，不会接收完整体数据。
- DSH 当前文件系统接口尚不支持 byte-range read，因此 alpha 版 Host 会在配置的文件上限内读取完整文件。

### 路线图

1. `.nii.gz`、NIfTI-2、qform/sform 解剖方向重排和交互式切片 session。
2. BIDS 数据集关系、JSON/TSV 表格和 events 时间线。
3. EDF/EDF+ 与 BrainVision 多通道波形和 marker。
4. EEGLAB `.set/.fdt` 支持。
5. 面向 NWB、MNE FIF、CIFTI 和 GIFTI 的可选 Python Worker。

---

## License / 许可

NeuroPreviewer is released under the [MIT License](LICENSE). Real test datasets are not redistributed with the source code and remain subject to their original licenses, citation requirements, and privacy terms.

NeuroPreviewer 使用 [MIT License](LICENSE) 开源。真实测试数据不随源代码再分发，并继续受各自原始许可证、引用要求和隐私条款约束。
