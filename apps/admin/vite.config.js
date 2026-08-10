import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// The `events` alias and the auth0-lock prebundle went with Auth0. Lock is a
// webpack-era library that imports Node's `events`; Vite externalizes Node
// builtins for the browser, so the import resolved to a stub and reading
// `events.EventEmitter` threw at module scope, before Vue could mount. Nothing
// left in this app needs a Node builtin shimmed.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173
  }
})
