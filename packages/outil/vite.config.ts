import { defineConfig } from "vite"
import pkg from "./package.json" with { type: "json" }

export default defineConfig({
  build: {
    sourcemap: true,

    lib: {
      entry: "./src/index.ts",
      fileName: "index",
      formats: ["es"]
    },

    rollupOptions: {
      external: Object.keys(pkg.peerDependencies)
    },

    emptyOutDir: false
  }
})
