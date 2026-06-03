import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/apps': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        headers: {
          Origin: 'http://localhost:8000',
          Referer: 'http://localhost:8000/'
        }
      },
      '/run_sse': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        headers: {
          Origin: 'http://localhost:8000',
          Referer: 'http://localhost:8000/'
        }
      }
    }
  }
});
