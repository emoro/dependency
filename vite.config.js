import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  // Needed for GitHub Pages: https://emoro.github.io/dependency/
  base: process.env.BASE_URL || '/',
})
