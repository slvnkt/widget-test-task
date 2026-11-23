import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/widget-test-task/',
  plugins: [react()],
  resolve: {
    alias: { '@ds': fileURLToPath(new URL('./ds/src', import.meta.url)) },
    dedupe: ['react', 'react-dom', '@phosphor-icons/react'],
  },
})
