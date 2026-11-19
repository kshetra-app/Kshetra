import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { ENVIRONMENT_CONFIGS } from '../../packages/shared/src/config/environments';

const requiredClientConfig = ['VITE_API_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_APP_ENV?.trim();
  if (target === 'staging' || target === 'production') {
    const expected = ENVIRONMENT_CONFIGS[target];
    if (
      env.VITE_API_URL?.replace(/\/+$/, '') !== expected.apiBaseUrl ||
      env.VITE_SUPABASE_URL?.replace(/\/+$/, '') !== expected.supabaseUrl
    ) {
      throw new Error(`The admin API and Supabase URLs must match the shared ${target} environment.`);
    }
  }
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
