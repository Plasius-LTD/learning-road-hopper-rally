import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/browser-worker.ts", "src/server.ts"],
  dts: true,
  sourcemap: true,
  clean: true,
  format: ["esm", "cjs"],
  target: "es2022",
  splitting: false,
  external: ["quickjs-emscripten"],
});
