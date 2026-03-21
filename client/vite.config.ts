import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '..'), 'NEO_DOCK');
  const serverPort = env.NEO_DOCK_PORT || '4445';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': `http://localhost:${serverPort}`,
        '/ws': { target: `ws://localhost:${serverPort}`, ws: true },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
