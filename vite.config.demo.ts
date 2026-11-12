import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/**
 * Builds the judge-testable browser demo into docs/ so GitHub Pages can serve it
 * from the repo. Same sources as the app -- no forks, no reimplementation.
 */
export default defineConfig({
  root: 'demo',
  base: '/ai-monster-courtroom/',
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('./docs', import.meta.url)),
    emptyOutDir: true,
    target: 'es2022',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
    },
  },
  define: {
    // the Devvit server reads these from the environment; the browser must not crash on
    // a bare `process` reference (src/agents/client.ts guards it, this is belt-and-braces)
    'process.env.OPENROUTER_API_KEY': 'undefined',
    'process.env.OPENROUTER_BASE_URL': 'undefined',
  },
  server: { port: 5174 },
});
