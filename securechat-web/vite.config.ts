import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
   server: {
    host: "0.0.0.0",
    port: 5174,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'public/**/*.{test,spec}.{ts,tsx}', 'supabase/**/*.{test,spec}.{ts,tsx}', 'dist/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/**', '**/*.spec.ts', '**/__tests__/**/*.spec.ts', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
