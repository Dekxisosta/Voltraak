import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/services': path.resolve(__dirname, './src/shared/services'),
      '@/components/common': path.resolve(__dirname, './src/shared/components/common'),
      '@/components/layout': path.resolve(__dirname, './src/shared/components/layout'),
      '@/components': path.resolve(__dirname, './src/shared/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/shared/hooks'),
      '@/api': path.resolve(__dirname, './src/shared/api'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/routes': path.resolve(__dirname, './src/routes'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/utils': path.resolve(__dirname, './src/shared/utils'),
      '@/contexts': path.resolve(__dirname, './src/shared/contexts'),
      '@/test': path.resolve(__dirname, './src/test'),
      '@': path.resolve(__dirname, './src'),
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'icons': ['lucide-react']
        }
      }
    }
  },
  preview: {
    port: 3000,
    host: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js']
  }
})