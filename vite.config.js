import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  // Required for GitHub Pages subpath: https://emoro.github.io/dependency/
  base: '/dependency/',
})
