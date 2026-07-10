import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // When watching IS enabled (local dev), explicitly ignore the runtime
      // data directory: server.ts writes to it on every /api/lookup call
      // (search history + OUI cache). Without this, those writes are seen
      // by Vite as source changes and trigger a full-page reload, which
      // remounts the app and clears the search input/result a moment after
      // every successful search.
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/data/**', '**/dist/**'] },
    },
  };
});
