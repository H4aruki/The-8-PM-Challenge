import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/The-8-PM-Challenge/',
  plugins: [react()],
})
