import tseslint from 'typescript-eslint';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: [new URL('./tsconfig.lib.json', import.meta.url).pathname],
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
      },
    },
  },
];