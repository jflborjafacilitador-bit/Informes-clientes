import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.png'],
      manifest: {
        name: 'Los Quetzales — Panel Administrativo',
        short_name: 'Quetzales CRM',
        description: 'Panel de gestión de clientes para Residencial Los Quetzales',
        theme_color: '#07090E',
        background_color: '#07090E',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/pwa-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/docs\.google\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'google-sheets-cache', networkTimeoutSeconds: 5 },
          },
          {
            urlPattern: /^https:\/\/.*supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-cache', networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
  build: {
    outDir: '.',
    emptyOutDir: false,
  },
})
