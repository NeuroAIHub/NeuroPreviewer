import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: true,
  clean: false,
  external: [
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-connection',
    '@deepseek-ai/dsh-fs',
    '@deepseek-ai/dsh-tools',
  ],
})
