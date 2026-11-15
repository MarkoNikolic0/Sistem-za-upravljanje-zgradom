import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    setupFiles: ['reflect-metadata'],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['test/**/*.e2e-spec.ts'],
          globalSetup: ['./test/pomoc/test-baza.ts'],
          setupFiles: ['reflect-metadata', './test/pomoc/izaberi-bazu.ts'],
          fileParallelism: false,
          testTimeout: 20000,
          hookTimeout: 60000,
        },
      },
    ],
  },
});
