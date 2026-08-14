#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${ROOT_DIR}/test-data/real"
SELECTION="${1:-all}"

case "${SELECTION}" in
  all|nifti|edf|brainvision|eeglab|nwb) ;;
  *)
    echo "usage: $0 [all|nifti|edf|brainvision|eeglab|nwb]" >&2
    exit 2
    ;;
esac

want() {
  [[ "${SELECTION}" == "all" || "${SELECTION}" == "$1" ]]
}

download() {
  local url="$1"
  local destination="$2"
  mkdir -p "$(dirname "${destination}")"
  if [[ -s "${destination}" ]]; then
    echo "exists  ${destination#"${ROOT_DIR}/"}"
    return
  fi
  echo "fetch   ${destination#"${ROOT_DIR}/"}"
  curl --fail --location --silent --show-error --retry 4 --retry-delay 2 \
    --connect-timeout 30 --max-time 1800 \
    --output "${destination}.part" "${url}"
  mv "${destination}.part" "${destination}"
}

if want nifti; then
  OPENNEURO="${DATA_DIR}/openneuro-ds000005"
  download "https://s3.amazonaws.com/openneuro.org/ds000005/dataset_description.json?versionId=VSS2KymVdu8mHqrufqmfoxqjvIgCm1g8" \
    "${OPENNEURO}/dataset_description.json"
  download "https://s3.amazonaws.com/openneuro.org/ds000005/participants.tsv?versionId=6p77QXyfdLa3arQfmC7eCZalO9xFGF23" \
    "${OPENNEURO}/participants.tsv"
  download "https://s3.amazonaws.com/openneuro.org/ds000005/task-mixedgamblestask_bold.json?versionId=B7L.nfriJzWa_kzdtiKknAnEEAgFrXKV" \
    "${OPENNEURO}/task-mixedgamblestask_bold.json"
  download "https://s3.amazonaws.com/openneuro.org/ds000005/sub-01/anat/sub-01_T1w.nii.gz?versionId=N.vvdRaCvbawrtFePSoW51oshmP3ASq1" \
    "${OPENNEURO}/sub-01/anat/sub-01_T1w.nii.gz"
  download "https://s3.amazonaws.com/openneuro.org/ds000005/sub-01/func/sub-01_task-mixedgamblestask_run-01_bold.nii.gz?versionId=WAifHVk1.09Zbf3bXqYcj05KIMVWQolL" \
    "${OPENNEURO}/sub-01/func/sub-01_task-mixedgamblestask_run-01_bold.nii.gz"
  download "https://s3.amazonaws.com/openneuro.org/ds000005/sub-01/func/sub-01_task-mixedgamblestask_run-01_events.tsv?versionId=Zw5C2RMW2Dvicq6wvaQQa.Cx5yGoqo16" \
    "${OPENNEURO}/sub-01/func/sub-01_task-mixedgamblestask_run-01_events.tsv"

  for archive in \
    "${OPENNEURO}/sub-01/anat/sub-01_T1w.nii.gz" \
    "${OPENNEURO}/sub-01/func/sub-01_task-mixedgamblestask_run-01_bold.nii.gz"
  do
    output="${archive%.gz}"
    if [[ ! -s "${output}" ]]; then
      echo "unpack  ${output#"${ROOT_DIR}/"}"
      gzip --decompress --keep --stdout "${archive}" > "${output}.part"
      mv "${output}.part" "${output}"
    fi
  done
fi

if want edf; then
  PHYSIONET="${DATA_DIR}/physionet-sleep-edfx"
  download "https://physionet.org/files/sleep-edfx/1.0.0/sleep-cassette/SC4001E0-PSG.edf" \
    "${PHYSIONET}/SC4001E0-PSG.edf"
  download "https://physionet.org/files/sleep-edfx/1.0.0/sleep-cassette/SC4001EC-Hypnogram.edf" \
    "${PHYSIONET}/SC4001EC-Hypnogram.edf"

  EEGMMIDB="${DATA_DIR}/physionet-eegmmidb"
  download "https://physionet.org/files/eegmmidb/1.0.0/S001/S001R01.edf" \
    "${EEGMMIDB}/S001R01.edf"
fi

EEGLAB_COMMIT="420769355b4e754628edfb43da2eb02c72fb8333"
EEGLAB_RAW="https://raw.githubusercontent.com/sccn/eeglab/${EEGLAB_COMMIT}/sample_data"

if want brainvision; then
  OPENNEURO_BV="${DATA_DIR}/openneuro-ds007629/sub-10014/eeg"
  download "https://s3.amazonaws.com/openneuro.org/ds007629/sub-10014/eeg/sub-10014_task-ReMind_run-1_eeg.eeg?versionId=PMzdOcbZJeYAazYpJishdAqUF90qIJfG" \
    "${OPENNEURO_BV}/sub-10014_task-ReMind_run-1_eeg.eeg"
  download "https://s3.amazonaws.com/openneuro.org/ds007629/sub-10014/eeg/sub-10014_task-ReMind_run-1_eeg.vhdr?versionId=ofODexBmh3wxDrFBjwG7pf1ATJfpfcAu" \
    "${OPENNEURO_BV}/sub-10014_task-ReMind_run-1_eeg.vhdr"
  download "https://s3.amazonaws.com/openneuro.org/ds007629/sub-10014/eeg/sub-10014_task-ReMind_run-1_eeg.vmrk?versionId=n443XwZo_9n_uRwqPXmWhgwayn4.4JqM" \
    "${OPENNEURO_BV}/sub-10014_task-ReMind_run-1_eeg.vmrk"

  BRAINVISION="${DATA_DIR}/eeglab-brainvision"
  download "${EEGLAB_RAW}/test_data/testbva.vhdr" "${BRAINVISION}/testbva.vhdr"
  download "${EEGLAB_RAW}/test_data/testbva.vmrk" "${BRAINVISION}/testbva.vmrk"
  download "${EEGLAB_RAW}/test_data/testbva.dat" "${BRAINVISION}/testbva.dat"
fi

if want eeglab; then
  EEGLAB="${DATA_DIR}/eeglab-sample"
  download "${EEGLAB_RAW}/eeglab_data.set" "${EEGLAB}/eeglab_data.set"
  download "${EEGLAB_RAW}/eeglab_data.fdt" "${EEGLAB}/eeglab_data.fdt"
fi

if want nwb; then
  DANDI="${DATA_DIR}/dandi-000006"
  download "https://api.dandiarchive.org/api/assets/32cb0ae9-49fd-4bf9-b939-3960df7aeca2/download/" \
    "${DANDI}/sub-anm369963_ses-20170228.nwb"
  download "https://api.dandiarchive.org/api/assets/d97954f2-6d80-4dda-9ecf-89c7c10fed0b/download/" \
    "${DANDI}/sub-anm369962_ses-20170316.nwb"
fi

CHECKSUM_FILE="${ROOT_DIR}/scripts/real-data.sha256"
if [[ -f "${CHECKSUM_FILE}" ]]; then
  echo "verify  scripts/real-data.sha256"
  (cd "${ROOT_DIR}" && sha256sum --check --ignore-missing "${CHECKSUM_FILE}")
fi

echo
du -ah "${DATA_DIR}" | sort -h | tail -n 20
