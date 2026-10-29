import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pruebas unitarias con Vitest (https://vitest.dev/config/).
  test: {
    environment: 'jsdom',
    // Muestra console.error/warn aunque la prueba pase (por defecto Vitest los oculta); así las
    // advertencias de React, como "not wrapped in act", no pasan desapercibidas.
    silent: false,
    // describe/it/expect/vi como globales, igual que en las pruebas de siempre (sin importarlos).
    globals: true,
    include: ['src/pruebas/**/*.spec.jsx'],
    // Variables que Vite inyecta en la app; en las pruebas se fijan a valores conocidos.
    env: { VITE_API_URL: 'http://localhost:4000/api' },
    // Cada prueba empieza con los spies originales restaurados.
    restoreMocks: true,
    // Orden aleatorio para detectar pruebas que dependen unas de otras.
    sequence: { shuffle: true },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/pruebas/**', 'src/main.jsx', '**/*.config.{js,cjs}'],
      reporter: ['text', 'text-summary', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
})
