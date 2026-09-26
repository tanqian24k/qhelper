import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 项目站点固定挂在 /qhelper/ 子路径（仓库名决定），base 必须匹配。
  // 若改用 Netlify Drop / 自有服务器根路径，改回 '/' 并同步 manifest 的 start_url/scope。
  base: '/qhelper/',
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'QHelper 智能减脂助手',
        short_name: 'QHelper',
        description: '个人减脂记录工具：规则计算每日热量预算，记录饮食与身体数据趋势。',
        lang: 'zh-CN',
        theme_color: '#16a34a',
        background_color: '#fafaf9',
        display: 'standalone',
        start_url: '/qhelper/',
        scope: '/qhelper/',
        icons: [
          { src: 'icon-192.png?v=3', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png?v=3', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png?v=3', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
