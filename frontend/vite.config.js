import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import laravel from 'laravel-vite-plugin'
import path from 'path'

export default defineConfig({
  plugins: [
    laravel({
      input: ['src/main.jsx'],
      // Laravel's public dir lives in the sibling `backend/` app, not here.
      // frontend/ is intentionally NOT moved under backend/resources/js -
      // this keeps the existing structure/aliases intact while Laravel
      // serves the built assets straight out of backend/public/build.
      publicDirectory: '../backend/public',
      buildDirectory: 'build',
      refresh: [
        '../backend/routes/**',
        '../backend/app/Modules/**/Controllers/**',
        '../backend/resources/views/**',
      ],
    }),
    react(),
  ],
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
    // outDir/rollupOptions.input are derived by the laravel() plugin above
    // (publicDirectory + buildDirectory, and the `input` option) - don't
    // override outDir here or assets will build to the wrong place.
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'icons': ['lucide-react']
        }
      }
    }
  },
  preview: {
    port: 3000,
    host: true,
    // Serve index.html for any unmatched path so BrowserRouter works on reload
    historyApiFallback: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js']
  }
})