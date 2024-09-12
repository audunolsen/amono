// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import svgr from 'vite-plugin-svgr';
// import tsPaths from 'vite-tsconfig-paths';
// import { visualizer } from 'rollup-plugin-visualizer';
// import { loadFonts } from '@uxi/design-system/vite-plugins';
// import { fileRouter } from '../../packages/file-router/plugin';

// export default defineConfig(async () => ({
//   css: {
//     modules: {
//       localsConvention: 'camelCase' as const,
//     },
//   },
//   // server: { port: 3000 },
//   build: {
//     outDir: 'build',
//     modulePreload: { polyfill: false },
//     commonjsOptions: {
//       include: [/node_modules/],
//     },
//   },
//   optimizeDeps: {
//     /**
//      * Internally linked package that's configured
//      * to be consumable by its source code, not built ouput.
//      */
//     exclude: ['@uxi/common', '@uxi/design-system'],
//   },

//   plugins: [
//     loadFonts(),
//     react(),
//     svgr(),
//     tsPaths({
//       /**
//        * Every locally linked workspace package must be
//        * added in array below if it has its own path aliasing
//        */
//       projects: [
//         'tsconfig.json',
//         '../../packages/common/tsconfig.json',
//         '../../packages/core/tsconfig.json',
//         '../../packages/design-system/tsconfig.json',
//       ],
//     }),
//     visualizer({
//       open: process.argv.includes('visualize'),
//       filename: './stats/index.html',
//       gzipSize: true,
//     }),
//     fileRouter(),
//   ],
// }));
