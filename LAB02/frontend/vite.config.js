import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api-apps': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api-apps/, '/apps')
      },
      '/run_sse': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
