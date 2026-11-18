import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const server = 'http://localhost:8787';

export default defineConfig({
  base: '/studio/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': server,
      '/media': server,
      '/preview': server,
      '/__unlock': server,
      // Alles buiten de Studio (bv. /work/ of /contact/) is de site zelf: die komt van de server.
      '^/(?!studio(/|$)|@vite|@react-refresh|@id|@fs|node_modules|src/).*': server,
    },
  },
});
