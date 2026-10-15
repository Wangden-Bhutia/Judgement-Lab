import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Lets a `pnpm dev` session also register a service worker, so an
      // offline check doesn't require a production build first.
      devOptions: { enabled: true, type: 'module' },
      workbox: {
        // All of the app's own code and content JSON; nothing fetched at
        // runtime over the network (no backend, by design -- see
        // docs/DECISIONS.md), so precaching everything here is sufficient
        // for the app to keep working with no connection.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'],
      },
      manifest: {
        name: 'Judgment Lab',
        short_name: 'Judgment Lab',
        description: 'Short exercises in reading a situation before reacting to it.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#aa3bff',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    }),
  ],
})
