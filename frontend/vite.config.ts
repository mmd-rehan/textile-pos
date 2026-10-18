import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// The whole project shares one .env at the repo root. Only VITE_* variables are
// exposed to the browser bundle; the rest are read here for the dev server.
const envDir = path.resolve(__dirname, '..');

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '');
  const backendPort = env.BACKEND_PORT || '5001';
  return {
    envDir,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: Number(env.FRONTEND_PORT || 5173),
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
