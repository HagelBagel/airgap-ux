import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],

  server: {
    // The API runs as its own process (server/, `npm run dev` there). Proxying
    // /api keeps app and API on one origin, so the browser needs no CORS and
    // a future session cookie can stay SameSite=Strict. See ADR 0005.
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },

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
    // server/ has its own Vitest config and needs a Postgres test database.
    exclude: [...configDefaults.exclude, 'server/**'],
  },
})
