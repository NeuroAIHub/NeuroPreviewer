export interface FixtureOptions {
  readonly dimensions?: readonly [number, number, number, number]
  readonly littleEndian?: boolean
  readonly slope?: number
  readonly intercept?: number
}

export function niftiInt16Fixture(options: FixtureOptions = {}): Uint8Array {
  const [x, y, z, t] = options.dimensions ?? [4, 3, 2, 1]
  const littleEndian = options.littleEndian ?? true
  const voxels = x * y * z * t
  const bytes = new Uint8Array(352 + voxels * 2)
  const view = new DataView(bytes.buffer)
  view.setInt32(0, 348, littleEndian)
  view.setInt16(40, 4, littleEndian)
  for (const [index, value] of [x, y, z, t].entries()) view.setInt16(42 + index * 2, value, littleEndian)
  view.setInt16(70, 4, littleEndian)
  view.setInt16(72, 16, littleEndian)
  view.setFloat32(80, 1, littleEndian)
  view.setFloat32(84, 2, littleEndian)
  view.setFloat32(88, 3, littleEndian)
  view.setFloat32(92, 4, littleEndian)
  view.setFloat32(108, 352, littleEndian)
  view.setFloat32(112, options.slope ?? 2, littleEndian)
  view.setFloat32(116, options.intercept ?? -5, littleEndian)
  view.setInt16(252, 1, littleEndian)
  view.setInt16(254, 2, littleEndian)
  const description = new TextEncoder().encode('synthetic test image')
  bytes.set(description, 148)
  bytes.set([0x6e, 0x2b, 0x31, 0], 344)
  for (let volume = 0; volume < t; volume += 1) {
    for (let zi = 0; zi < z; zi += 1) {
      for (let yi = 0; yi < y; yi += 1) {
        for (let xi = 0; xi < x; xi += 1) {
          const index = (((volume * z + zi) * y + yi) * x + xi)
          const value = volume * 1000 + zi * 100 + yi * 10 + xi
          view.setInt16(352 + index * 2, value, littleEndian)
        }
      }
    }
  }
  return bytes
}
