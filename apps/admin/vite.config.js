import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // auth0-lock (v12, a webpack-era library) imports Node's `events`.
      // Vite externalizes Node builtins for the browser, so the import resolved
      // to a stub and reading `events.EventEmitter` threw at module scope —
      // which killed the app before Vue could mount. The `events` npm package
      // is the browser implementation of that builtin.
      events: 'events'
    }
  },
  optimizeDeps: {
    include: ['auth0-lock', 'events']
  },
  server: {
    port: 5173
  }
})
