declare module 'jsfive' {
  export class File {
    constructor(buffer: ArrayBuffer, filename?: string)
    readonly keys: readonly string[]
    get(path: string): { readonly value: unknown, readonly shape?: readonly number[], readonly attrs?: Record<string, unknown> } | undefined
  }
}
