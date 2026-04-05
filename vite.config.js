import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/utf8_icons/',
  plugins: [react()],
  build: {
    outDir: 'docs',
  },
})
