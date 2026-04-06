import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/integration/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['node_modules/', 'dist/', 'build/', 'release/', 'tests/unit/'],
        testTimeout: 10000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/main/**/*', 'src/shared/**/*', 'src/renderer/**/*'],
            exclude: [
                'node_modules/',
                'dist/',
                'build/',
                'release/',
                'tests/',
                '**/*.test.ts',
                '**/*.test.tsx',
                '**/*.spec.ts',
                '**/*.spec.tsx',
                '**/*.config.ts',
                '**/*.d.ts',
                '**/types/**',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src/main'),
            '@renderer': path.resolve(__dirname, './src/renderer'),
            '@shared': path.resolve(__dirname, './src/shared'),
        },
    },
});
