import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    setupFiles: ['./src/__tests__/setup.js'],
  },
})
