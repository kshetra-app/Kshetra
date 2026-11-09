import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const requiredClientConfig = ['VITE_API_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (mode === 'production') {
    const missing = requiredClientConfig.filter((name) => !env[name]?.trim());
    if (missing.length > 0) {
      throw new Error(`Cannot build web-admin for production. Set: ${missing.join(', ')}`);
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@kshetra/shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
    server: {
      port: 3000,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
    },
  };
});
