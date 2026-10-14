import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/js/main.jsx'],
            refresh: [
                'routes/**',
                'app/Modules/**/Controllers/**',
                'resources/views/**',
            ],
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@/shared':              path.resolve(__dirname, './resources/js/shared'),
            '@/services':            path.resolve(__dirname, './resources/js/shared/services'),
            '@/components/common':   path.resolve(__dirname, './resources/js/shared/components/common'),
            '@/components/layout':   path.resolve(__dirname, './resources/js/shared/components/layout'),
            '@/components':          path.resolve(__dirname, './resources/js/shared/components'),
            '@/pages':               path.resolve(__dirname, './resources/js/pages'),
            '@/hooks':               path.resolve(__dirname, './resources/js/shared/hooks'),
            '@/api':                 path.resolve(__dirname, './resources/js/shared/api'),
            '@/styles':              path.resolve(__dirname, './resources/js/styles'),
            '@/routes':              path.resolve(__dirname, './resources/js/routes'),
            '@/features':            path.resolve(__dirname, './resources/js/features'),
            '@/utils':               path.resolve(__dirname, './resources/js/shared/utils'),
            '@/contexts':            path.resolve(__dirname, './resources/js/shared/contexts'),
            '@/test':                path.resolve(__dirname, './resources/js/test'),
            '@':                     path.resolve(__dirname, './resources/js'),
        },
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        // Tell the laravel-vite-plugin to write localhost into the hot file
        // so the browser gets a reachable URL instead of [::]
        hmr: {
            host: 'localhost',
        },
    },
    build: {
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    icons:  ['lucide-react'],
                },
            },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./resources/js/test/setup.js'],
    },
})
