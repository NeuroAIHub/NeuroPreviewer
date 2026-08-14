import { describe, expect, it } from 'vitest'
import { inspectNifti, inspectNiftiTimeSeries, inspectNiftiVoxel, NeuroPreviewError } from '../src/core/nifti.js'
import { niftiInt16Fixture } from './fixture.js'

describe('inspectNifti', () => {
  it('parses metadata and the default axial slice', () => {
    const result = inspectNifti(niftiInt16Fixture(), { path: 'sample.nii' })
    expect(result.metadata).toMatchObject({
      format: 'nifti-1',
      dimensions: [4, 3, 2, 1],
      voxelSize: [1, 2, 3, 4],
      datatype: 'int16',
      bitpix: 16,
      littleEndian: true,
      sclSlope: 2,
      sclIntercept: -5,
      qformCode: 1,
      sformCode: 2,
      description: 'synthetic test image',
    })
    expect(result.frame).toMatchObject({
      axis: 'axial',
      index: 1,
      volume: 0,
      width: 4,
      height: 3,
      intensityMin: 195,
      intensityMax: 241,
    })
    expect(result.frame.pixels).toHaveLength(12)
  })

  it('extracts coronal, sagittal, and 4D views', () => {
    const bytes = niftiInt16Fixture({ dimensions: [4, 3, 2, 2], slope: 1, intercept: 0 })
    const coronal = inspectNifti(bytes, { path: 'sample.nii', axis: 'coronal', index: 1, volume: 1 })
    expect(coronal.frame).toMatchObject({ width: 4, height: 2, intensityMin: 1010, intensityMax: 1113 })
    const sagittal = inspectNifti(bytes, { path: 'sample.nii', axis: 'sagittal', index: 2, volume: 0 })
    expect(sagittal.frame).toMatchObject({ width: 3, height: 2, intensityMin: 2, intensityMax: 122 })
  })

  it('supports big-endian NIfTI-1', () => {
    const result = inspectNifti(niftiInt16Fixture({ littleEndian: false }), { path: 'big.nii', index: 0 })
    expect(result.metadata.littleEndian).toBe(false)
    expect(result.frame.intensityMin).toBe(-5)
    expect(result.frame.intensityMax).toBe(41)
  })

  it('extracts a voxel value and its fourth-dimension time series', () => {
    const bytes = niftiInt16Fixture({ dimensions: [4, 3, 2, 4], slope: 1, intercept: 0 })
    expect(inspectNiftiVoxel(bytes, { x: 2, y: 1, z: 1, volume: 3 })).toBe(3112)
    expect(inspectNiftiTimeSeries(bytes, { x: 2, y: 1, z: 1 })).toEqual({
      indices: [0, 1, 2, 3],
      values: [112, 1112, 2112, 3112],
      min: 112,
      max: 3112,
    })
  })

  it('bounds long time series by evenly sampling the first and last volumes', () => {
    const bytes = niftiInt16Fixture({ dimensions: [1, 1, 1, 9], slope: 1, intercept: 0 })
    const series = inspectNiftiTimeSeries(bytes, { x: 0, y: 0, z: 0 }, 3)
    expect(series.indices).toEqual([0, 4, 8])
    expect(series.values).toEqual([0, 4000, 8000])
  })

  it('rejects malformed, truncated, out-of-range, and oversized requests', () => {
    expect(() => inspectNifti(new Uint8Array(20), { path: 'bad.nii' })).toThrowError(NeuroPreviewError)
    expect(() => inspectNifti(niftiInt16Fixture(), { path: 'sample.nii', index: 2 })).toThrow(/0 to 1/)
    expect(() => inspectNifti(niftiInt16Fixture(), { path: 'sample.nii' }, 4)).toThrow(/exceeding/)
    expect(() => inspectNifti(niftiInt16Fixture().slice(0, 360), { path: 'sample.nii', index: 1 })).toThrow(/truncated/)
  })
})
