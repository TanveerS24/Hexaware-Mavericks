import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const TARGET = process.env.VITE_PROXY_TARGET || 'https://hexaware-mavericks.onrender.com';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/officer/auth': { target: TARGET, changeOrigin: true, secure: false },
      '/officer/queue': { target: TARGET, changeOrigin: true, secure: false },
      '/officer/issues': { target: TARGET, changeOrigin: true, secure: false },
      '/officer/me': { target: TARGET, changeOrigin: true, secure: false },
      '/officer/notifications': { target: TARGET, changeOrigin: true, secure: false },
      '/citizen/chatbot': { target: TARGET, changeOrigin: true, secure: false },
      '/citizen/notifications': { target: TARGET, changeOrigin: true, secure: false },
    }
  }
})
