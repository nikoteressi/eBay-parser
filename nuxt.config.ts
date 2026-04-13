// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  nitro: {
    serverAssets: [
      {
        baseName: 'migrations',
        dir: './server/database/migrations',
      },
    ],
  },

  runtimeConfig: {
    // Server-only (process.env.ADMIN_TOKEN)
    adminToken: process.env.ADMIN_TOKEN ?? '',
    public: {
      // Client-side — set via NUXT_PUBLIC_ADMIN_TOKEN env var
      adminToken: process.env.NUXT_PUBLIC_ADMIN_TOKEN ?? '',
    },
  },

  css: ['~/assets/css/global.css'],

  app: {
    head: {
      title: 'eBay Tracker & Notifier',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Self-hosted eBay search monitor. Paste URLs, track prices, get notified.',
        },
        { name: 'theme-color', content: '#1a1d27' },
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
      ],
    },
  },
})
