/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/services': path.resolve(__dirname, './src/shared/services'),
      '@/components/common': path.resolve(__dirname, './src/shared/components/common'),
      '@/components/layout': path.resolve(__dirname, './src/shared/components/layout'),
      '@/components': path.resolve(__dirname, './src/shared/components'),
      '@/hooks': path.resolve(__dirname, './src/shared/hooks'),
      '@/api': path.resolve(__dirname, './src/shared/api'),
      '@/utils': path.resolve(__dirname, './src/shared/utils'),
      '@/contexts': path.resolve(__dirname, './src/shared/contexts'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/routes': path.resolve(__dirname, './src/routes'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/test': path.resolve(__dirname, './src/test'),
      '@': path.resolve(__dirname, './src'),
    },
  },
})