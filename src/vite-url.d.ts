// Minimal type shim so TypeScript understands Vite/Rollup-style `?url` imports.
//
// This avoids type errors with tsc
declare module '*?url' {
  const url: string;
  export default url;
}

// Wrangler/esbuild can provide `*.wasm` imports as precompiled `WebAssembly.Module`.
declare module '*.wasm' {
  const wasmModule: WebAssembly.Module;
  export default wasmModule;
}
