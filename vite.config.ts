import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(() => {
  // Capacitor Android 打包时设置 VITE_PLATFORM=capacitor：
  // 1. base 改为 '/'（capacitor://localhost 根路径加载，无子路径）
  // 2. 关闭 PWA Service Worker（原生壳资源内置离线，SW 在 WebView 里是已知坑源）
  const isCapacitor = process.env.VITE_PLATFORM === 'capacitor'
  const base = isCapacitor ? '/' : '/qhelper/'
  return {
    base,
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    define: {
      'import.meta.env.VITE_IS_CAPACITOR': JSON.stringify(isCapacitor ? '1' : ''),
    },
    plugins: [
      react(),
      // 网页版保留 PWA；Capacitor 构建不注入 SW/manifest（原生 App 不需要）
      ...(isCapacitor
        ? []
        : [
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
          ]),
    ],
  }
})
