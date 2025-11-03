import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the Football CRM frontend.  The project
// uses React with TypeScript, and Tailwind CSS for styling.  The
// configuration below enables React Fast Refresh, TypeScript support
// and ensures the appropriate JSX transform is used.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});