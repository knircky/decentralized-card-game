import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  define: {
    'process.env': process.env,
    global: 'globalThis',
    'process.browser': true,
    'process.version': '"v16.0.0"',
    'process.nextTick': '((fn, ...args) => setTimeout(() => fn(...args), 0))'
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      stream: 'stream-browserify',
      util: 'util',
      process: 'process/browser',
      events: 'events'
    }
  },
  optimizeDeps: {
    include: ['buffer', 'stream-browserify', 'util', 'process/browser', 'events'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
})