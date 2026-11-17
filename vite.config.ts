/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// public/ is Vite's public dir: data at /data/*.json, imagery at /img/*.
// The dev server binds to localhost only; Vite's default fs.deny keeps .env files unreachable.
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: false },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
