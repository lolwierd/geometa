import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    // Set NODE_ENV to test to ensure test database is used
    env: {
      NODE_ENV: 'test',
    },
    // Run tests sequentially to avoid database race conditions
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
});
