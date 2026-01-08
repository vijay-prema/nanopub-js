/**
 * Lazy-loading + one-time initialization for `@nanopub/sign`.
 *
 * This enables running @nanopub/sign (wasm) in browser environments, while still
 * having a small bundle size on initial load, by importing wasm only when actually
 * needed (e.g. sign/publish).
 *
 * Additionally supports "worker-like" runtimes (e.g. Cloudflare Workers via Wrangler)
 * by using wasm-bindgen's `initSync()` with a precompiled `WebAssembly.Module`.
 */

type NanopubSignWebModule = typeof import("@nanopub/sign/web.js");
type NanopubSignBundlerModule = typeof import("@nanopub/sign/bundler.js");

const isNode =
  typeof process !== "undefined" &&
  typeof process.versions !== "undefined" &&
  typeof process.versions.node === "string";

// Vitest can run with a DOM shim (e.g. happy-dom) while still being Node.
// Prefer the Node build whenever we're in Node to avoid browser-init paths.
const isBrowser =
  !isNode && typeof window !== "undefined" && typeof document !== "undefined";

// Cloudflare Workers / edge runtimes typically have `fetch` + `WebAssembly` but no DOM.
// Wrangler's bundler can provide `.wasm` imports as precompiled `WebAssembly.Module`s.
// Using wasm-bindgen `initSync()` avoids any runtime fetch/bytes/data-url compilation path.
const isWorkerLike =
  !isNode &&
  !isBrowser &&
  typeof WebAssembly !== "undefined" &&
  typeof fetch === "function";

let modulePromise: Promise<
  NanopubSignWebModule | NanopubSignBundlerModule
> | null = null;
let webInitPromise: Promise<unknown> | null = null;

/**
 * Returns an initialized `@nanopub/sign` module appropriate for the current runtime.
 *
 * - Browser: dynamically imports `@nanopub/sign/web.js` and initializes it with a wasm URL.
 * - Node: dynamically imports `@nanopub/sign/bundler.js` (self-initializing).
 */
export async function getNanopubSignModule(): Promise<
  NanopubSignWebModule | NanopubSignBundlerModule
> {
  if (modulePromise) return modulePromise;

  modulePromise = (async () => {
    // Worker/edge runtime path (Wrangler / Cloudflare Workers)
    if (isWorkerLike) {
      const [mod, wasmMod] = await Promise.all([
        import("@nanopub/sign/web.js"),
        import("@nanopub/sign/web_bg.wasm"),
      ]);

      // Initialize WASM once per runtime.
      if (!webInitPromise) {
        const wkmod: WebAssembly.Module =
          (wasmMod as any).default ?? (wasmMod as any);

        // Prefer sync init with a precompiled module (worker-friendly).
        webInitPromise = (mod as any).initSync
          ? Promise.resolve((mod as any).initSync(wkmod))
          : (mod as any).default(wkmod);
      }
      await webInitPromise;

      return mod;
    }

    if (isBrowser) {
      const mod = await import("@nanopub/sign/web.js");

      // Initialize WASM once per runtime.
      if (!webInitPromise) {
        // Avoid Vite/Rollup-specific `?url` imports so this file stays compatible with
        // non-Vite bundlers (e.g. Wrangler/esbuild).
        //
        // wasm-bindgen's web glue defaults to: new URL('web_bg.wasm', import.meta.url)
        // which bundlers can typically statically analyze and ship as an asset.
        webInitPromise = mod.default();
      }
      await webInitPromise;

      return mod;
    }

    // Always prefer the ESM bundler entry when not in a real browser, regardless of
    // whether it is Node or not.
    // This avoids importing `@nanopub/sign/node.js` (which relies on Node `__dirname`),
    // which can throw runtime errors in some "node" environments such as Vitest.
    return await import("@nanopub/sign/bundler.js");
  })();

  return modulePromise;
}
