import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import dts from "vite-plugin-dts";

export default defineConfig({
  // We no longer need `vite-plugin-top-level-await` as we now lazy-load `@nanopub/sign`.
  plugins: [wasm(), dts({ rollupTypes: true })],
  optimizeDeps: {
    exclude: ["@nanopub/sign"],
  },
  // Build in library mode
  build: {
    lib: {
      // Multi-entry build:
      // - `nanopub-js` (browser-friendly) does NOT import `.wasm` modules
      // - `nanopub-js/worker` (Wrangler/CF Workers) can import `.wasm` and use initSync
      //
      // Consumers pick the right entrypoint via package.json `exports`.
      entry: {
        index: "src/index.ts",
        worker: "src/worker.ts",
      },
      name: "nanopub-js",
      fileName: (_format, entryName) => entryName,
      // Avoid UMD output: Rollup UMD does not support top-level await and some wasm
      // dependency patterns. ESM output is the primary supported format.
      formats: ["es"],
    },
    // Ensure wasm assets referenced via `new URL('*.wasm', import.meta.url)` are emitted
    // alongside the JS output.
    assetsInlineLimit: 0,

    // `@nanopub/sign/web_bg.wasm` (wasm-bindgen web target) contains an import module named
    // "wbg". Vite's wasm plugin attempts to transform/bundle it, which fails resolution.
    // We only ever load this wasm via Wrangler/Workers (as a `WebAssembly.Module`) using
    // wasm-bindgen's `initSync()`, so keep it external for the Vite library build.
    rollupOptions: {
      external: ["@nanopub/sign/web_bg.wasm"],
    },
  },

  resolve: {
    conditions: ["module", "import", "default"],
  },

  test: {
    environment: "node",
    globals: true,

    server: {
      deps: {
        optimizer: {
          ssr: {
            include: ["@nanopub/sign/dist/index.js"],
            exclude: ["@nanopub/sign"],
          },
        },
      },
    },

    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },

});
