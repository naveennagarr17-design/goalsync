import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// VITE_BASE_PATH is "/" for local use. On GitHub Pages it is "/<repository-name>/".
// The GitHub Actions workflow sets it for you automatically.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  test: { environment: 'node' },
});
