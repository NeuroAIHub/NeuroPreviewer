# “Neuro Preview” name landscape

Research snapshot: **2026-08-14**. This note uses first-party product pages,
official repositories, and public package/project registries. It is a naming and
discoverability review, **not legal advice or trademark clearance**.

## Bottom line

**Evidence:** No exact public match for the complete name `NeuroPreview` or
`Neuro Preview` was found in the registries checked. The unscoped npm and PyPI
variants `neuropreview`, `neuro-preview`, and `dsh-neuro-preview` returned 404;
the checked scoped npm identity also returned 404. GitHub's repository-name
search returned zero results for `NeuroPreview`,
and equivalent GitLab and Docker Hub searches were empty.

**Evidence:** There are, however, unusually close names in the same field:

- **NeuroView** is NeuroSky's brainwave-analysis application.
- **NeuroViewer** is a published VS Code extension for viewing NIfTI files.
- **Neuroviewer** is UCLA B.R.A.I.N.'s web viewer for neuronal reconstructions.
- **Neuroview Technology** develops an implantable long-term EEG monitor.

**Assessment:** There is no verified exact-string blocker, but there is a
**material discoverability and spoken-recall collision**. Users and search
engines can easily collapse “preview,” “view,” and “viewer,” especially when
the products all concern brain data. The selected name is **NeuroPreviewer**,
qualified in public copy as **NeuroPreviewer for DSH**, with package identity
`@neuroaihub/dsh-neuro-previewer`. The DSH qualifier and controlled npm scope
reduce ambiguity, but do not remove the nearby NeuroViewer/NeuroView risks. A
real trademark clearance is still required before relying on this choice.

## 1. Exact-name and namespace checks

“Exact” here means the complete name after ignoring case, spacing, and a single
hyphen; it does not mean a substring such as `something-neuro-preview-demo`.

| Namespace checked | Query | Result on 2026-08-14 |
| --- | --- | --- |
| npm | [`neuropreview`](https://registry.npmjs.org/neuropreview), [`neuro-preview`](https://registry.npmjs.org/neuro-preview), [`dsh-neuro-preview`](https://registry.npmjs.org/dsh-neuro-preview) | Each official registry endpoint returned `404 Not Found`. |
| npm, scoped | [`@neuroaihub/dsh-neuro-previewer`](https://registry.npmjs.org/@neuroaihub%2Fdsh-neuro-previewer) | Official registry endpoint returned `404 Not Found`. This says nothing about ownership or publish rights for the `@neuroaihub` scope. |
| PyPI | [`neuropreview`](https://pypi.org/pypi/neuropreview/json), [`neuro-preview`](https://pypi.org/pypi/neuro-preview/json), [`dsh-neuro-preview`](https://pypi.org/pypi/dsh-neuro-preview/json) | Each official JSON endpoint returned `404 Not Found`. |
| Anaconda.org | [`neuropreview`](https://api.anaconda.org/search?name=neuropreview), [`neuro-preview`](https://api.anaconda.org/search?name=neuro-preview) | Official search API returned an empty array for each query. |
| GitHub repositories | [`NeuroPreview in:name`](https://api.github.com/search/repositories?q=NeuroPreview%20in%3Aname) | Official Search API returned `total_count: 0`. |
| GitLab projects | [`neuropreview`](https://gitlab.com/api/v4/projects?search=neuropreview&simple=true&per_page=100) | Official projects API returned an empty array. |
| Docker Hub repositories | [`neuropreview`](https://hub.docker.com/v2/search/repositories/?query=neuropreview&page_size=25) | Official search API returned `count: 0`. |

These are dated observations, not reservations. A 404 does not promise that a
registry will accept a future publication, and every result can change after
this note is written. Private projects, source-code identifiers, mobile stores,
company-name registers, domains, and unindexed or non-English uses were not
exhaustively searched.

No exact first-party product use of **NeuroPreview** or **Neuro Preview** was
verified in this pass. That is negative search evidence, not proof of worldwide
absence.

## 2. Closest names in neuroscience

The first four rows are the important near-collisions. The remaining rows show
established “Neuro + inspection/viewing word” brands that make the naming space
crowded even though their spellings are more distinct.

| Name | What the owner says it is | Evidence | Collision assessment |
| --- | --- | --- | --- |
| **NeuroView** — NeuroSky | A professional brainwave-analysis application with exact headset measurements and controllable graph axes; its output can include raw EEG and derived values. | NeuroSky's official [NeuroView comparison](https://support.neurosky.com/kb/applications/what-is-the-difference-between-brainwave-visualizer-and-neuroview-research-tools) and [log-format documentation](https://support.neurosky.com/kb/applications/neuroview-log-files-formats). | **High.** Only “Pre” separates the spoken and written names, and both concern previews/plots of neural signals. |
| **NeuroViewer** — VS Code Marketplace | A public VS Code extension for viewing neuroimaging files; its listing and repository specifically describe NIfTI visualization, metadata, volume rendering, and web compatibility. | Official [Visual Studio Marketplace listing](https://marketplace.visualstudio.com/items?itemName=anibalsolon.neuro-viewer) and [source repository](https://github.com/anibalsolon/vscode-neuro-viewer). | **High.** Nearly the same words, the same NIfTI use case, and a similar developer-tool context. This is the closest functional collision. |
| **Neuroviewer** — UCLA B.R.A.I.N. | A Vue single-page application for visualizing neuronal reconstruction files in SWC format. | UCLA B.R.A.I.N.'s [official repository](https://github.com/ucla-brain/neuroviewer). | **High lexically, medium functionally.** Same “Neuro + viewer” construction, but neuron morphology rather than MRI/EEG/NWB preview. |
| **Neuroview Technology** | A medical-device company developing a small implantable subcutaneous long-term EEG brain monitor. | Company's [official site](https://neuroviewtech.com/). | **Medium.** Not a general data viewer, but an active neuro/EEG name in an adjacent commercial and clinical market. |
| **Neuroglancer** | A WebGL viewer for volumetric data, cross-sections, meshes, and skeletons; supported sources include single NIfTI files. | Project's [official repository](https://github.com/google/neuroglancer). | **Medium category pressure.** Distinct wording, but an established `Neuro*` web-volume viewer. |
| **neurosift** | A browser tool for neuroscience-data visualization focused on NWB, with DANDI, EMBER, and OpenNeuro exploration; it also uses NiiVue for NIfTI. | Flatiron Institute's [official repository](https://github.com/flatironinstitute/neurosift). | **Medium category pressure.** Distinct spelling but almost the same broad, browser-based “inspect neuroscience data” promise. |
| **NeuroExplorer** | A licensed analysis program for continuous signals, spike trains, behavioral events, and spike waveforms. | Vendor's [feature overview](https://www.neuroexplorer.com/features/) and [license purchase page](https://www.neuroexplorer.com/purchase/). | **Medium category pressure.** An established commercial `Neuro + exploration` product in electrophysiology. |

**Inference:** “Neuro Preview” is understandable on first contact, but that is
also its weakness as a standalone brand: both words describe the category.
Exact spelling had no result in the sampled registries, while memorable search
ownership is likely to be weak.

## 3. Viewer landscape by data type

This is a representative comparison, not an exhaustive feature matrix. “Open”
means a first-party public source repository was verified; “vendor” means the
commercial owner publishes the cited product page.

### MRI, fMRI, and NIfTI

| Tool | Model and surface | Verified overlap with Neuro Preview |
| --- | --- | --- |
| **NiiVue** | Open web library/application | Its repository calls it a web-based neuroimaging visualization tool and lists NIfTI among its native voxel formats. It is embeddable, cross-device, and substantially deeper than a single preview slice. [Official repository](https://github.com/niivue/niivue) |
| **Papaya** | Open, pure-JavaScript web viewer | Supports NIfTI and DICOM, orthogonal views, overlays, atlases, surfaces, and local or server-hosted use. [Official repository](https://github.com/rii-mango/Papaya) |
| **FSLeyes** | Open desktop/Python viewer | FSL's image viewer for 3D and 4D neuroimaging data; it is a mature interactive analysis surface rather than a lightweight agent response. [Official documentation](https://open.win.ox.ac.uk/pages/fsl/fsleyes/fsleyes/userdoc/) and [source](https://gitlab.com/fsl/fsleyes/fsleyes) |
| **Neuroglancer** | Open client-side web viewer | Displays arbitrary volume cross-sections, 3D meshes, and skeletons, and explicitly supports single NIfTI files. [Official repository](https://github.com/google/neuroglancer) |
| **NeuroViewer** | Open VS Code/web extension | Gives a quick NIfTI view with metadata, histogram, range highlighting, and volume rendering. Its editor integration is especially close to Neuro Preview's developer workflow. [Official repository](https://github.com/anibalsolon/vscode-neuro-viewer) |

### EEG and MEG

| Tool | Model and surface | Verified overlap with Neuro Preview |
| --- | --- | --- |
| **Brainstorm** | Open desktop application | An analysis application for MEG, EEG, fNIRS, ECoG, depth electrodes, and animal electrophysiology, with a graphical interface. [Official repository](https://github.com/brainstorm-tools/brainstorm3) |
| **MNELAB / MNE-Python** | Open desktop GUI and Python plots | MNELAB imports MNE-supported formats, exports EDF/BDF/BrainVision/EEGLAB/FIFF, manages events and annotations, and plots raw data, epochs, evoked responses, and more. [MNELAB repository](https://github.com/cbrnr/mnelab); MNE also documents its built-in [interactive Raw browser](https://mne.tools/stable/auto_tutorials/raw/40_visualize_raw.html). |
| **EDFbrowser** | Open desktop viewer/toolbox | A dedicated browser and processing toolbox for EDF/EDF+/BDF/BDF+ physiological signal files. [Official project page](https://www.teuniz.net/edfbrowser/) |
| **BrainVision Analyzer** | Vendor desktop product | Brain Products describes it as EEG/ERP processing software for data from nearly any EEG amplifier. [Official product page](https://www.brainproducts.com/solutions/analyzer/) |
| **NeuroView** | NeuroSky vendor application | Provides live and recorded brainwave measurement/graphing and raw EEG export. It is less format-general than the roadmap but the closest name. [Official support documentation](https://support.neurosky.com/kb/applications/what-is-the-difference-between-brainwave-visualizer-and-neuroview-research-tools) |

### NWB and extracellular electrophysiology

| Tool | Model and surface | Verified overlap with Neuro Preview |
| --- | --- | --- |
| **neurosift** | Open browser application and local command | Interactively visualizes NWB files and explores DANDI, EMBER, and OpenNeuro; a local `view-nwb` command is documented. [Official repository](https://github.com/flatironinstitute/neurosift) |
| **NWBWidgets** | Open Jupyter widgets | Navigates the NWB hierarchy and renders specific data elements in Jupyter, designed to work out of the box with NWB 2.0. [Official repository](https://github.com/NeurodataWithoutBorders/nwbwidgets) |
| **Open Ephys GUI** | Open desktop acquisition/visualization app | Acquires and visualizes extracellular-electrode data through a plugin architecture. It is experiment-facing rather than a read-only file preview. [Official repository](https://github.com/open-ephys/plugin-GUI) |
| **NeuroExplorer** | Commercial desktop analysis product | Imports many acquisition formats and analyzes continuous signals, timestamps, spike trains, behavioral events, and waveforms. [Official feature page](https://www.neuroexplorer.com/features/) |

### Web-tool implications

NiiVue, Papaya, Neuroglancer, NeuroViewer, and neurosift establish that
browser-based neuroscience viewing is already a mature category. Their names
also show two common strategies: a short coined brand (**NiiVue**, **Papaya**,
**neurosift**) or a descriptive compound (**Neuroglancer**, **NeuroViewer**).

**Inference for this project:** Neuro Preview's meaningful differentiation is
not “a neuroscience viewer.” It is the narrower workflow: a read-only,
resource-bounded preview tool and DSH card that lets an agent inspect local
scientific files. The public name and description should lead with
**NeuroAIHub**, **DSH**, and **agent/tool preview**, rather than implying a new
general-purpose viewer competing feature-for-feature with NiiVue or neurosift.

## 4. Recommended naming posture

1. Use **NeuroPreviewer for DSH** in headings, release pages, screenshots, and
   prose. Avoid presenting bare **Neuro Preview** as the primary brand.
2. Use `@neuroaihub/dsh-neuro-previewer` as the package identity if the
   `@neuroaihub` npm scope is controlled. The scope and `dsh-` qualifier do
   useful disambiguation that the display name lacks.
3. Treat `neuro_preview` as a machine-facing tool identifier, not proof of an
   ownable brand. In search metadata, pair it with “NeuroAIHub,” “DeepSeek
   Harness,” and supported formats.
4. Do not claim that the name is “available” based on registry 404s. Re-run the
   namespace checks immediately before publication.
5. If the project will become a standalone multi-format viewer or commercial
   product, choose a coined name and commission jurisdiction-appropriate
   trademark clearance before launch.

## 5. Legal and research limits

This review did **not** determine likelihood of confusion under any country's
law, search national or state company-name registers exhaustively, assess Nice
classes, or establish priority of use. It also did not reserve a package,
domain, social handle, or trademark.

The USPTO itself says a comprehensive clearance search checks a variety of
resources for confusingly similar marks used with related goods and services,
including federal records and common-law internet use. See the USPTO's
[official clearance-search guidance](https://www.uspto.gov/trademarks/search/comprehensive-clearance-search-similar-trademarks).
The registry and product survey above is therefore useful product research,
but it is not a substitute for that process or for advice from a qualified
trademark professional.
