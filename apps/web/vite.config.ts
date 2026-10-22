import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    host: '0.0.0.0', port: Number(process.env.WEB_PORT ?? 5173), strictPort: true,
    proxy: Object.fromEntries(['/api', '/socket.io'].map(path => [path, { target: `http://127.0.0.1:${process.env.PORT ?? 3000}`, ws: path === '/socket.io' }])),
  },
});
