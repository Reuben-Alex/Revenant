/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// public/ is Vite's public dir: data at /data/*.json, imagery at /img/*.
// The dev server binds to localhost only; Vite's default fs.deny keeps .env files unreachable.
// Spec 07 Requirement 8.1: four pages. The main page (index.html) reads no URL in production (spec 04);
// dossier.html and phone.html read only their own hash; opening.html is a static frame.
// Paths are relative to the project root (Vite's root), so no Node types are needed here.

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: false },
  build: {
    rollupOptions: {
      input: { main: 'index.html', dossier: 'dossier.html', phone: 'phone.html', opening: 'opening.html' },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
