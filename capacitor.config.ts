import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Android 打包（M4）。卓易通/Android 环境安装。
  appId: 'io.qhelper.app',
  appName: 'QHelper',
  // 根路径构建产物（vite.config.ts base='/'）
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  server: {
    // 生产包离线运行（assets 内置），不指向任何远程服务器
    androidScheme: 'https',
  },
  plugins: {
    // 原生壳走 capacitor-sqlite（spec §3：iOS WebView 的 IndexedDB 可能被系统回收）。
    // Web 端不走这条路径，仍用 Dexie/IndexedDB —— 分流见 src/repo/index.ts。
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      androidIsEncryptionKey: false,
    },
  },
}

export default config