// Worker-specific entrypoint.
//
// Use this entrypoint in runtimes like Cloudflare Workers/Wrangler where importing
// the wasm as a module is supported/required.
//
// IMPORTANT: do not import this entrypoint in browser/Vite apps unless you have
// wasm plugins configured; use the default `nanopub-js` entry instead.

import * as wasmMod from "@nanopub/sign/web_bg.wasm";
import { setNanopubSignWasmInitArg } from "./wasm.js";

// Wrangler typically provides the wasm import as a precompiled `WebAssembly.Module`
// (sometimes under `.default`).
setNanopubSignWasmInitArg((wasmMod as any).default ?? (wasmMod as any));

export * from "./index.js";
