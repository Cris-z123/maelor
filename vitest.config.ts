import { defineConfig } from 'vitest/config';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
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
            // Coverage targets per constitution v1.1.0: ≥80% line, ≥70% branch
            // Security-critical modules (encryption, validation, desensitization, sandbox) require 100% branch coverage
            // Note: perFile: false allows unimplemented files (0% coverage) without blocking
            // Security modules must still reach 100% (enforced manually)
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 70,
                statements: 80,
                perFile: false,
            },
        },
        include: ['tests/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['node_modules/', 'dist/', 'build/', 'release/'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src/main'),
            '@renderer': path.resolve(__dirname, './src/renderer'),
            '@shared': path.resolve(__dirname, './src/shared'),
        },
    },
});
