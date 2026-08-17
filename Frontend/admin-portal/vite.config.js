import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const TARGET = process.env.VITE_PROXY_TARGET || 'https://hexaware-mavericks.onrender.com';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    host: true,
    proxy: {
      '/admin': {
        target: TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/officer': {
        target: TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/citizen': {
        target: TARGET,
        changeOrigin: true,
        secure: false,
      },
    }
  }
})
