import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],

  worker: {
    // Bundle workers as ES modules so they can use top-level import/export
    // and tree-shake @huggingface/transformers correctly.
    format: 'es',
  },

  optimizeDeps: {
    // Exclude transformers from Vite's pre-bundler — it ships its own
    // ES modules and workers that must not be re-processed by esbuild.
    exclude: ['@huggingface/transformers'],
  },

  test: {
    environment: 'jsdom',
    globals: true,
  },
})
