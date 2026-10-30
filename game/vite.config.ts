import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Account API (server/) runs on 8787; in production nginx proxies /api on the same origin.
  server: { port: 5173, host: true, proxy: { '/api': 'http://127.0.0.1:8787' } },
  preview: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: { manualChunks: (id: string) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
