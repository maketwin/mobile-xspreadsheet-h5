import { base } from 'eslint-config-ali';
import prettier from 'eslint-plugin-prettier/recommended';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src/vendor/**',
      'src_backup-*/**',
      'coverage/**',
      '*.config.js',
    ],
  },
  ...base,
  prettier,
];
