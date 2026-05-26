// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  css: [
    '~/assets/css/main.css'
  ],

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase',
    '@vite-pwa/nuxt'
  ],

  supabase: {
    redirect: false // 關閉全域自動跳轉，便於我們手動控制登入流與自訂 UI 路由
  },

  future: {
    compatibilityVersion: 4
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: '顧股咕 - 手機股票交易記錄平台',
      short_name: '顧股咕',
      description: '為手機端優化的個人股票交易紀錄與移動平均成本計算系統 (PWA)',
      theme_color: '#0a0f1d',
      background_color: '#0a0f1d',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        {
          src: 'icon.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: 'icon.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      navigateFallback: '/'
    },
    devOptions: {
      enabled: false // 生產環境再開啟
    }
  }
})
