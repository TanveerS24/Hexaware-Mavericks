import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/officer': {
        target: 'https://hexaware-mavericks.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/citizen': {
        target: 'https://hexaware-mavericks.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'wss://hexaware-mavericks.onrender.com',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    }
  }
})
