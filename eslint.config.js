import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['apps/client/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['packages/engine/src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['firebase', 'firebase/**', 'firebase-admin', 'firebase-admin/**', '@firebase/**', '@capacitor/**', 'react', 'react/**', 'react-dom', 'react-dom/**', '@afterimage/ui', '@afterimage/ui/**', '@afterimage/client', '@afterimage/client/**'],
          message: 'Keep the engine independent from Firebase, native platforms, and UI.',
        }],
      }],
    },
  },
);
