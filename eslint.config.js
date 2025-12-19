import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.js', '**/*.ts'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                fetch: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
                HTMLElement: 'readonly',
                HTMLCanvasElement: 'readonly',
                HTMLImageElement: 'readonly',
                Event: 'readonly',
                CustomEvent: 'readonly',
                FileReader: 'readonly',
                Blob: 'readonly',
                URL: 'readonly',
                Image: 'readonly',
                FormData: 'readonly',
                Response: 'readonly',
                Request: 'readonly',
                Headers: 'readonly',
                navigator: 'readonly',
                location: 'readonly',
                atob: 'readonly',
                btoa: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                performance: 'readonly',
                crypto: 'readonly'
            }
        },
        rules: {
            // Errors - these will break at runtime
            'no-undef': 'error',
            'no-unused-vars': 'warn',
            'no-redeclare': 'error',
            'no-dupe-keys': 'error',
            'no-duplicate-case': 'error',
            'no-unreachable': 'error',

            // Warnings - potential issues
            'no-console': 'off', // Allow console for debugging
            'prefer-const': 'warn',
            'no-var': 'warn',
            'eqeqeq': ['warn', 'smart'],

            // TypeScript specific
            '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' for gradual migration
            '@typescript-eslint/no-unused-vars': ['warn', {
                'argsIgnorePattern': '^_',
                'varsIgnorePattern': '^_'
            }],
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',

            // Style (less strict for existing code)
            'semi': 'off',
            'quotes': 'off',
            'indent': 'off'
        }
    },
    {
        // Ignore patterns
        ignores: [
            'dist/**',
            'node_modules/**',
            '*.config.js',
            '*.config.ts',
            'vite.config.js'
        ]
    }
);
