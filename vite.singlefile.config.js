import { defineConfig } from 'vite';

// Build a single, fully self-contained index.html that runs from file://
// (no dev server, no module loading, fonts inlined as base64).
export default defineConfig({
  base: './',
  build: {
    target: 'esnext',
    outDir: 'dist-single',
    assetsInlineLimit: 100_000_000, // inline every asset (fonts) as base64
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',              // classic script -> runs under file://
        inlineDynamicImports: true,  // one bundle, no chunks
        manualChunks: undefined,
      },
    },
  },
});
