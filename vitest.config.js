/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./resources/js/test/setup.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'resources/js/test/',
                '**/*.d.ts',
                '**/*.config.*',
                'public/',
                'vendor/',
            ],
        },
    },
    resolve: {
        alias: {
            '@/shared':             path.resolve(__dirname, './resources/js/shared'),
            '@/services':           path.resolve(__dirname, './resources/js/shared/services'),
            '@/components/common':  path.resolve(__dirname, './resources/js/shared/components/common'),
            '@/components/layout':  path.resolve(__dirname, './resources/js/shared/components/layout'),
            '@/components':         path.resolve(__dirname, './resources/js/shared/components'),
            '@/hooks':              path.resolve(__dirname, './resources/js/shared/hooks'),
            '@/api':                path.resolve(__dirname, './resources/js/shared/api'),
            '@/utils':              path.resolve(__dirname, './resources/js/shared/utils'),
            '@/contexts':           path.resolve(__dirname, './resources/js/shared/contexts'),
            '@/pages':              path.resolve(__dirname, './resources/js/pages'),
            '@/styles':             path.resolve(__dirname, './resources/js/styles'),
            '@/routes':             path.resolve(__dirname, './resources/js/routes'),
            '@/features':           path.resolve(__dirname, './resources/js/features'),
            '@/test':               path.resolve(__dirname, './resources/js/test'),
            '@':                    path.resolve(__dirname, './resources/js'),
        },
    },
})
