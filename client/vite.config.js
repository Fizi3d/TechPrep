import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the Express server so they are same-origin in dev
    // (no CORS setup needed, and session cookies work).
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
