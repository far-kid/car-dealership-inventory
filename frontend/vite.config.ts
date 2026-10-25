import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: Number(process.env.E2E_FRONTEND_PORT ?? 5173),
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.E2E_API_PORT ?? 8000}`,
        changeOrigin: true,
      },
    },
  },
  test: {
    // Thread workers avoid child-process IPC stalls on Windows with Node 26.
    pool: 'threads',
    maxWorkers: 1,
    testTimeout: 15_000,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.test.*', 'src/types.ts'],
      reporter: ['text', 'html'],
    },
  },
})
