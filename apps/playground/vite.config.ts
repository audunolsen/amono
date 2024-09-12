import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { visualizer } from "rollup-plugin-visualizer"

export default defineConfig(async () => ({
  css: {
    modules: {
      localsConvention: "camelCase" as const
    }
  },
  plugins: [
    react(),
    visualizer({
      open: process.argv.includes("visualize"),
      filename: "./stats/index.html",
      gzipSize: true
    })
  ]
}))
