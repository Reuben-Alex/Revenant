/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// public/ is Vite's public dir: data at /data/*.json, imagery at /img/*.
// The dev server binds to localhost only; Vite's default fs.deny keeps .env files unreachable.
// Spec 07 Requirement 8.1: four pages. The main page (index.html) reads no URL in production (spec 04);
// dossier.html and phone.html read only their own hash; opening.html is a static frame.
const page = (name: string) => fileURLToPath(new URL(`./${name}.html`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: false },
  build: {
    rollupOptions: {
      input: { main: page('index'), dossier: page('dossier'), phone: page('phone'), opening: page('opening') },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
