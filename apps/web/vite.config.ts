import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this project from /second-nature/, not the domain
  // root, so every asset/route reference needs that prefix in production.
  // GITHUB_PAGES is set only by the Pages deploy workflow; `pnpm dev` and
  // any other build target still get the root path.
  base: process.env.GITHUB_PAGES ? '/second-nature/' : '/',
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
        name: 'Second Nature',
        short_name: 'Second Nature',
        description: 'Short exercises in reading a situation before reacting to it.',
        start_url: process.env.GITHUB_PAGES ? '/second-nature/' : '/',
        display: 'standalone',
        background_color: '#f6f6f4',
        theme_color: '#678a60',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    }),
  ],
})
