import { base } from 'eslint-config-ali';

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
];
