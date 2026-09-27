import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Android 打包（M4 路线 B）。卓易通/Android 环境安装。
  appId: 'io.qhelper.app',
  appName: 'QHelper',
  // 根路径构建产物（vite.config.ts base='/'）
  webDir: 'dist',
  // Android WebView 支持 IndexedDB；Dexie 数据层原样沿用
  android: {
    allowMixedContent: false,
  },
  server: {
    // 生产包离线运行（assets 内置），不指向任何远程服务器
    androidScheme: 'https',
  },
}

export default config
