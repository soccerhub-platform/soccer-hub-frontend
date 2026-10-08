import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the Football CRM frontend.  The project
// uses React with TypeScript, and Tailwind CSS for styling.  The
// configuration below enables React Fast Refresh, TypeScript support
// and ensures the appropriate JSX transform is used.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Cache the stable runtime together; let Rollup share the remaining route dependencies.
          // One chunk per npm package produced dozens of tiny startup requests and empty files.
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-core';
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  server: {
    port: 3000,
    watch: { ignored: ['**/test-results/**', '**/playwright-report/**'] },
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        // Media controller owns /api/media; other controllers are mounted without /api.
        rewrite: (path) => path.startsWith('/api/media/') ? path : path.replace(/^\/api/, ''),
      }
    }
  },
});
