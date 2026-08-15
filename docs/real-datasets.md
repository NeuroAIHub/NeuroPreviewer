# Small real datasets for preview testing

Verified 2026-08-14 against the repositories' own pages, APIs, object metadata,
and checksum manifests. These are public research data, not generated fixtures.
Prefer the version-pinned URLs below over a repository's moving `draft` or
unversioned object URL.

## Shortlist

| Format | Minimal test data | Download size | License | Works in the current plugin? |
| --- | --- | ---: | --- | --- |
| NIfTI-1 in BIDS | OpenNeuro `ds000005`, `sub-01_T1w.nii.gz` | 5,515,017 B compressed; 11,796,832 B as `.nii` | PDDL 1.0; attribution/community norms requested | **Yes.** Both `.nii` and `.nii.gz` open directly; BIDS relationships are not interpreted yet. |
| EDF+ EEG | PhysioNet EEG Motor Movement/Imagery, `S001R01.edf` | 1,275,936 B (1.22 MiB) | ODC Attribution 1.0 | **Yes.** Calibrated multichannel waveforms and mixed sample rates are supported; annotations are detected but not rendered. |
| BrainVision EEG | OpenNeuro `ds007629`, subject 10014, ReMind run 1 | 43,190,543 B (41.19 MiB) for `.eeg` + `.vhdr` + `.vmrk` | CC0 1.0 | **Yes.** Open the `.vhdr`; its relative `.eeg` companion is resolved automatically. Marker rendering is pending. |
| NWB | DANDI `000006`, mouse session `20170316` | 609,568 B (0.58 MiB) | CC BY 4.0 | **Yes, subset.** `Units/spike_times` is rendered as per-unit binned spike counts; other groups are not visualized yet. |

The default host file limit is 256 MiB, so every individual file here is below
that limit.

## 1. NIfTI/BIDS: OpenNeuro mixed-gambles T1w

This is a real human T1-weighted structural scan from the OpenfMRI/OpenNeuro
mixed-gambles study (`ds000005`). It is a useful happy-path test because gzip
decompression produces a valid single-file NIfTI-1 image: `sizeof_hdr` is 348
and magic is `n+1`.

- Version-pinned download:
  <https://s3.amazonaws.com/openneuro.org/ds000005/sub-01/anat/sub-01_T1w.nii.gz?versionId=N.vvdRaCvbawrtFePSoW51oshmP3ASq1>
- Compressed size: **5,515,017 B** (5.26 MiB).
- Decompressed size: **11,796,832 B** (11.25 MiB).
- SHA-256, downloaded `.nii.gz`:
  `75c615d7cce397be7a967ba31c932872488ff514586adf302cf8f73c7b4ff6b7`.
- SHA-256, decompressed `.nii`:
  `91047a7abb6a455fe6bf9c597a573c453f7d62201bfca0cfbfd4f6578192d6ac`.
- Dataset metadata and terms:
  <https://s3.amazonaws.com/openneuro.org/ds000005/dataset_description.json?versionId=VSS2KymVdu8mHqrufqmfoxqjvIgCm1g8>.
  The embedded license is the Open Data Commons Public Domain Dedication and
  License 1.0, with attribution/share-alike community norms requested.
- Requested citation from that metadata: Tom, S. M.; Fox, C. R.; Trepel, C.;
  Poldrack, R. A. (2007), “The neural basis of loss aversion in decision-making
  under risk,” *Science* 315(5811):515–518.

Reproducible preparation:

```bash
curl -L --fail \
  'https://s3.amazonaws.com/openneuro.org/ds000005/sub-01/anat/sub-01_T1w.nii.gz?versionId=N.vvdRaCvbawrtFePSoW51oshmP3ASq1' \
  -o sub-01_T1w.nii.gz
printf '%s  %s\n' \
  75c615d7cce397be7a967ba31c932872488ff514586adf302cf8f73c7b4ff6b7 \
  sub-01_T1w.nii.gz | sha256sum -c -
gzip -dk sub-01_T1w.nii.gz
printf '%s  %s\n' \
  91047a7abb6a455fe6bf9c597a573c453f7d62201bfca0cfbfd4f6578192d6ac \
  sub-01_T1w.nii | sha256sum -c -
```

Privacy: this is a human structural image, so treat it as sensitive even though
it is public. OpenNeuro requires structural scans to be defaced **or** to have
explicit participant consent and ethical authorization for publication; that
policy is not proof that this particular file is anonymous. Do not attempt
re-identification. See OpenNeuro's official [upload rules](https://docs.openneuro.org/user_guide.html#uploading-your-dataset).

Current-plugin note: `.nii` and `.nii.gz` both work. BIDS sidecars and directory
semantics are ignored, and anatomical reorientation is not yet
implemented, so the preview follows voxel storage order.

## 2. EDF+: PhysioNet EEG Motor Movement/Imagery

`S001R01.edf` is a one-minute, 64-channel baseline recording from a dataset of
109 human volunteers. It is small enough for a fast parser/metadata/signal
preview fixture and contains EDF+ annotations.

- Direct versioned download:
  <https://physionet.org/files/eegmmidb/1.0.0/S001/S001R01.edf>.
- Size: **1,275,936 B** (1.22 MiB).
- SHA-256:
  `4743b736131a7e147c150e8b37711029b6cda5e356c4b3e8261a03cdcaaf8b0c`.
- First-party checksum manifest:
  <https://physionet.org/files/eegmmidb/1.0.0/SHA256SUMS.txt>.
- Official dataset page:
  <https://physionet.org/content/eegmmidb/1.0.0/>.
- License: [Open Data Commons Attribution License
  1.0](https://physionet.org/content/eegmmidb/view-license/1.0.0/); retain
  attribution and notices required there.
- Dataset citation: Schalk, G. (2009), *EEG Motor Movement/Imagery Dataset*
  (version 1.0.0), PhysioNet, RRID:SCR_007345,
  <https://doi.org/10.13026/C28G6P>. The landing page also requests the standard
  PhysioNet citation and cites the BCI2000 paper.

Verification:

```bash
curl -L --fail \
  https://physionet.org/files/eegmmidb/1.0.0/S001/S001R01.edf \
  -o S001R01.edf
curl -L --fail \
  https://physionet.org/files/eegmmidb/1.0.0/SHA256SUMS.txt \
  -o SHA256SUMS.txt
grep ' S001/S001R01.edf$' SHA256SUMS.txt |
  sed 's# S001/# #' | sha256sum -c -
```

Privacy: this is human-volunteer EEG. The public EDF header's patient field is
masked (`X X X X`) and the filename uses a study subject code, but the dataset
page does not make a blanket anonymity claim. Treat it as de-identified or
pseudonymized research data, not as proof of irreversible anonymization, and do
not attempt re-identification.

Current-plugin note: this file drives the real EDF+ waveform smoke test. The
annotation channel is detected and excluded from numeric traces; annotation
events are not rendered yet.

## 3. BrainVision: OpenNeuro ROAMM run 1

ROAMM (`ds007629`, snapshot 1.3.0) is real human EEG collected during
naturalistic reading. BrainVision is a three-file format, so all three files
must keep their original basenames in the same directory; the `.vhdr` links to
the binary `.eeg` and marker `.vmrk` by relative name.

| File | Bytes | SHA-256 | Version-pinned download |
| --- | ---: | --- | --- |
| `sub-10014_task-ReMind_run-1_eeg.eeg` | 43,188,224 | `319bf1442414e8f57427916337ff0b59bfb1c2c1ae4b1857cfd110e7e6987dce` | [S3 object](https://s3.amazonaws.com/openneuro.org/ds007629/sub-10014/eeg/sub-10014_task-ReMind_run-1_eeg.eeg?versionId=PMzdOcbZJeYAazYpJishdAqUF90qIJfG) |
| `sub-10014_task-ReMind_run-1_eeg.vhdr` | 1,801 | `f5e8699399ffac35845141a8b701fa6eb763034a2f9378f9989dfb7b8f8740e4` | [S3 object](https://s3.amazonaws.com/openneuro.org/ds007629/sub-10014/eeg/sub-10014_task-ReMind_run-1_eeg.vhdr?versionId=ofODexBmh3wxDrFBjwG7pf1ATJfpfcAu) |
| `sub-10014_task-ReMind_run-1_eeg.vmrk` | 518 | `780a7bc5576c3e3e5dad4dbc642a347c176a3ba3dd3b5b26bedf0771c3084dd6` | [S3 object](https://s3.amazonaws.com/openneuro.org/ds007629/sub-10014/eeg/sub-10014_task-ReMind_run-1_eeg.vmrk?versionId=n443XwZo_9n_uRwqPXmWhgwayn4.4JqM) |

- Snapshot landing page and version DOI:
  <https://openneuro.org/datasets/ds007629/versions/1.3.0> and
  <https://doi.org/10.18112/openneuro.ds007629.v1.3.0>.
- Versioned dataset metadata:
  <https://s3.amazonaws.com/openneuro.org/ds007629/dataset_description.json?versionId=tUsNCKNThzHBY__MaVvZDdA6Hk6h8b2h>.
- License: CC0 1.0, as declared by the dataset metadata and OpenNeuro snapshot.
- Requested citation: Sun, H.; Olszko, A. V.; Singh, N.; Jangraw, D. C.
  (2026), “ROAMM: A Benchmark Dataset for Multimodal Human Attention
  Decoding and EEG-to-Text Modeling During Naturalistic Reading,” ICML 2026,
  <https://openreview.net/forum?id=zqLPdt09fE>.

For checksum verification, put the three hash/file pairs above in a local
`SHA256SUMS` file and run `sha256sum -c SHA256SUMS`. The S3 `versionId` pins
each byte sequence; avoid the equivalent unversioned bucket URLs for stable
fixtures.

Privacy: the dataset is public under CC0, but it remains pseudonymized human
data. Its versioned [participants table](https://s3.amazonaws.com/openneuro.org/ds007629/participants.tsv?versionId=fhRtz_tSLrfDUt72m5OHdmF90kvXvWJY)
publishes exact age, sex, handedness, ADHD diagnosis, and reading-disability
status. That combination is sensitive and can increase linkage risk. Keep test
fixtures access-controlled as appropriate and never describe the data as
anonymous.

Current-plugin note: open the `.vhdr`. The plugin resolves its relative `.eeg`
reference and previews multiplexed float32/int16/uint16 data. The `.vmrk`
reference is preserved by the fixture but marker overlays are not implemented.

## 4. NWB: DANDI mouse ALM session

This is a real extracellular electrophysiology session from a house mouse in a
delay-response task. It is unusually small for NWB and therefore well suited to
header/tree preview tests without fetching a multi-gigabyte recording.

- Immutable asset download endpoint:
  <https://api.dandiarchive.org/api/assets/d97954f2-6d80-4dda-9ecf-89c7c10fed0b/download/>.
- Asset metadata, including both content URLs and digest:
  <https://api.dandiarchive.org/api/assets/d97954f2-6d80-4dda-9ecf-89c7c10fed0b/>.
- Dandiset/version metadata:
  <https://api.dandiarchive.org/api/dandisets/000006/versions/0.220126.1855/>.
- Path: `sub-anm369962/sub-anm369962_ses-20170316.nwb`.
- Size: **609,568 B** (0.58 MiB).
- Repository-published SHA-256:
  `c35c73d0e2b2f3a88520605036fb181eb53d207f554431612c922940b70d2717`.
- License: CC BY 4.0; attribution is required.
- Citation: Economo, M. N.; Svoboda, K. (2022), *Mouse anterior lateral motor
  cortex (ALM) in delay response task* (version 0.220126.1855), DANDI Archive,
  <https://doi.org/10.48324/dandi.000006/0.220126.1855>.

Verification:

```bash
curl -L --fail \
  https://api.dandiarchive.org/api/assets/d97954f2-6d80-4dda-9ecf-89c7c10fed0b/download/ \
  -o sub-anm369962_ses-20170316.nwb
printf '%s  %s\n' \
  c35c73d0e2b2f3a88520605036fb181eb53d207f554431612c922940b70d2717 \
  sub-anm369962_ses-20170316.nwb | sha256sum -c -
```

Privacy: the asset metadata identifies the subject as a house mouse
(`NCBITaxon:10090`), not a person, so human participant privacy is not at issue.
Normal attribution and research-integrity obligations still apply.

Current-plugin note: the pure-JavaScript NWB adapter reads the Units ragged
`spike_times` table and renders binned counts per unit. General acquisition,
processing, image, and table browsing remains future work.

## Fixture policy

Do not silently vendor these data into the package. A test-data fetch script or
CI cache should download on demand, verify SHA-256 before use, preserve the
source citation/license alongside the cache, and use an explicit opt-in for
human data. For permanent CI fixtures, prefer the animal NWB file and the
single EDF file; the BrainVision binary is the largest download and is better
suited to an integration-test job.

## Repository-local corpus

`scripts/download-real-data.sh` downloads the four curated fixtures above and
also keeps several supplementary, version-pinned parser fixtures locally:

- the OpenNeuro `ds000005` run-01 BOLD image and events table, giving the
  current NIfTI Adapter a real `64 × 64 × 34 × 240` four-dimensional input;
- the PhysioNet Sleep-EDF Expanded pair `SC4001E0-PSG.edf` and
  `SC4001EC-Hypnogram.edf` (ODC Attribution 1.0), for mixed-sampling-rate PSG
  signals and sleep-stage annotations;
- EEGLAB's official `eeglab_data.set/.fdt` sample and `testbva` BrainVision
  regression triplet, pinned to EEGLAB commit
  `420769355b4e754628edfb43da2eb02c72fb8333`;
- a second small DANDI `000006` session,
  `sub-anm369963_ses-20170228.nwb`, under the same CC BY 4.0 terms.

The EEGLAB repository's BSD-2-Clause file explicitly describes the core source
code and does not separately grant terms for every sample recording. These
EEGLAB files are therefore downloaded only into the ignored local test cache;
do not redistribute them without confirming the data owner's terms. All local
files, including derived uncompressed NIfTI copies, are checked by
`scripts/real-data.sha256`.
