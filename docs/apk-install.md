# QHelper APK 安装说明（路线 B · 卓易通/Android）

## 安装包

`qhelper-debug.apk`（4.4 MB，debug 签名，位于本仓库根目录）

- 应用名：QHelper
- 包名：`io.qhelper.app`
- 目标系统：Android 7.0+（minSdk 24），含鸿蒙 7 卓易通环境
- 数据存储：Android WebView IndexedDB（与网页版 Dexie 数据层完全一致）

## 安装步骤（华为手机 · 卓易通）

1. 把 `qhelper-debug.apk` 传到手机（微信文件传输助手 / 数据线 / 网盘均可）
2. 手机上打开 APK：
   - 若通过**卓易通**：文件管理器里点 APK → 选择用卓易通打开 → 按提示安装
   - 安装时如提示「未知来源应用」，允许卓易通「安装未知应用」权限
3. 安装完成后桌面出现 **QHelper 爱心图标**
4. 首次打开：
   - 若手机上网页版已有数据 → 是独立存储，需要重新填一次档案（App 与网页数据不互通）
   - 以后数据存在 App 自己的沙箱里，**不会被浏览器清理**（这是做 APK 的核心目的）

## 从网页版迁移数据（可选）

1. 手机浏览器打开网页版 → 设置 → 导出全部数据（得到 JSON 文件）
2. 打开 QHelper App → 设置 → 从文件导入 → 选中刚才的 JSON
3. 数据完整迁移（档案/目标/饮食记录/测量/自定义食物）

> 注意：导入会整库替换 App 内现有数据。

## 更新版本

以后发新版：本机 `npm run build && npx cap sync android` → gradle 打新 APK → 传手机覆盖安装（数据保留）。也可以直接说一声，我打新包。

## 给开发者的话（构建环境备忘）

- 需要 JDK 21（已装 `C:\dev\java\jdk-21`）+ Android SDK（已装 `C:\dev\android-sdk`，platform 36）
- 构建命令：`cd android && set JAVA_HOME=C:\dev\java\jdk-21 && gradle assembleDebug`
- gradle wrapper 在本机有 SSL 中间人问题，改用直接解压的 gradle 8.14.3（`%USERPROFILE%\.gradle\wrapper\dists\gradle-8.14.3-all\gradle-8.14.3\bin`）
- debug 签名仅自用；若日后上架应用市场需生成正式 keystore 签名
