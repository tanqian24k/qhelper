# 智能减脂助手：跨端框架与本地存储选型研究

> 研究日期：2026-02-13。约束：网页端先行、之后 iOS/Android、桌面端后置；一套代码跨端优先；MVP 纯本地存储、无后端；界面中文；1–3 个月内可用。
> 说明：本文所有关键论断均附来源链接，优先引用官方文档与一手资料；个别无法直接核实到官方页面的点已标注置信度。

---

## TL;DR 结论摘要

- **推荐方案：Vite + React（纯客户端 SPA）+ Vite PWA 插件，本地存储用 Dexie（IndexedDB 封装）；后续用 Capacitor 把同一套 Web 代码打包成 iOS/Android 原生壳，移动端数据层切换到 Capacitor SQLite（或带 `navigator.storage.persist()` 的 IndexedDB）。**
- Expo（React Native + react-native-web）是强力的替代方案：一套代码同时跑 iOS/Android/Web，且 Expo 官方文档专为 LLM 提供了 Markdown 版本（[llms.txt](https://docs.expo.dev/llms.txt)），对 AI 代写非常友好。代价是网页端体验受 React Native Web 组件约束、团队熟悉度与社区库依赖更深。
- Flutter 不推荐作为首选：官方支持六端，但 Flutter Web 走 CanvasKit/自绘渲染路线，与"浏览器即用、可被搜索、体量小"的网页先行目标相性最差。
- 存储结论：网页端 MVP 用 **Dexie/IndexedDB** 即可（配额远超 localStorage 的 10 MiB 上限）；iOS WebView 中 IndexedDB 存在被系统回收的风险（Capacitor 官方文档明确警示），上移动端时应迁移到原生 SQLite。
- 主要风险：① iOS 对 PWA/WebView 存储的清理策略；② MVP 无后端 = 无同步/备份，用户换设备即丢数据，需要尽早做导出/导入；③ 从 Dexie 到移动 SQLite 需要预留一个存储抽象层。

---

## 1. 候选方案对比

### 1.1 候选一览

| 方案 | 网页先行体验 | 复用到 iOS/Android 成本 | 本地存储 | 中文资料/生态 | LLM 代码生成适配 |
| --- | --- | --- | --- | --- | --- |
| **Vite + React PWA**（推荐） | ★★★★★ 纯 SPA，秒级冷启动，HMR 即时（Vite 官方中文文档详尽：[为什么选 Vite](https://cn.vite.dev/guide/why)） | ★★★★ 用 [Capacitor](https://capacitorjs.com/docs/basics/workflow) 官方支持 `npm run build` 后 `npx cap sync` 打包 iOS/Android | IndexedDB/Dexie；移动端可换 SQLite | Vite/React 中文文档齐全 | React 是 LLM 训练语料中最主流的前端框架之一，模板与示例极多 |
| Next.js + React PWA | ★★★☆ 对纯本地 MVP 而言 SSR/路由层是多余复杂度，静态导出才贴近 SPA（[Static Exports](https://nextjs.org/docs/app/guides/static-exports)） | 同上可配 Capacitor | 同上 | 中文资料极多 | 极高，但 API 面大、版本变动快，AI 生成易混用 App/Pages Router |
| Expo (React Native + RN Web) | ★★★☆ 同一套组件跑三端（[Expo Router 简介](https://docs.expo.dev/router/introduction/)："using the same components on multiple platforms (Android, iOS, and web)"），但 Web 是 RN 组件模拟 DOM，非自由 HTML/CSS | ★★★★★ 原生即主目标，[EAS Build/Submit](https://docs.expo.dev/distribution/introduction/) 直接出包上架 | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) 官方原生 SQLite | RN 中文社区活跃 | 极高；Expo 文档原生提供 LLM Markdown 版（每页注明 "available as Markdown for AI agents and LLMs"，[llms.txt](https://docs.expo.dev/llms.txt)） |
| Flutter（Web + 移动） | ★★☆ Web 为自绘渲染，首屏体积大、SEO/文本体验弱（[Flutter 支持平台](https://docs.flutter.dev/reference/supported-platforms)、[Web 渲染器](https://docs.flutter.dev/platform-integration/web/renderers)） | ★★★★★ 六端一套 | sqlite3/drift 等 Dart 侧方案 | 中文资料丰富 | 中等，Dart 语料显著少于 JS/TS |

### 1.2 各维度展开

**（a）网页先行体验。** Vite 的开发体验核心是原生 ESM + 即时 HMR，官方中文文档明言"开发服务器的启动几乎都是即时的"（[为什么选 Vite](https://cn.vite.dev/guide/why)）。对"用户验收 + AI 迭代"的协作方式，秒级反馈最省摩擦。PWA 化只需 `vite-plugin-pwa` 一行配置即可生成 manifest 与 service worker（[Vite PWA Getting Started](https://vite-pwa-org.netlify.app/guide/)），实现"添加到主屏幕 + 离线可用"。Next.js 的价值主要在 SSR/SSG/SEO——对一个纯本地、无后端、单用户的减脂记录工具而言收益趋近于零，反而引入服务端/客户端边界等 AI 容易出错的概念面。

**（b）复用到 iOS/Android 的成本。**
- Capacitor 路线：官方工作流就是"现有 Vite/CRA Web 应用 → `npx cap sync` 拷贝 Web 产物到原生工程 → `npx cap run ios/android`"（[Capacitor Workflow](https://capacitorjs.com/docs/basics/workflow)）。复用成本约等于"加一个壳 + 适配插件"。
- Expo 路线：Web 从一开始就是一等公民（[Expo Router](https://docs.expo.dev/router/introduction/)），三端一套导航与组件；上架走 EAS Build/Submit（[Distribution Overview](https://docs.expo.dev/distribution/introduction/)）。复用成本最低，但网页端的视觉自由度受限于 react-native-web。
- Flutter 路线：Flutter 官方支持 iOS/Android/Web/桌面六端（[Supported platforms](https://docs.flutter.dev/reference/supported-platforms)），但 Web 端是 CanvasKit 自绘（[Web renderers](https://docs.flutter.dev/platform-integration/web/renderers)），"网页先行、浏览器即用"的体验不是它的强项。

**（c）本地存储能力。** 见第 2 节。

**（d）中文资料与生态。** Vite 有官方维护的[简体中文文档](https://cn.vite.dev/guide/why)，React/RN 的中文社区（React 官方中文文档、掘金/阮一峰等）覆盖远超 Dart/Flutter 与 Svelte 系；vite-plugin-pwa 亦有[简体中文站点](https://vite-pwa-org-zh.netlify.app/guide/)。对无编程经验的用户，遇到问题时"中文可搜"是真实收益。

**（e）AI 代码生成成功率与主流度。** 没有权威机构发布过"LLM 写 React vs Flutter"的对照基准（此点为综合判断，置信度中等）。可用的一手信号：
- Expo 官方为 LLM 提供全站 Markdown 文档与 [llms.txt 索引](https://docs.expo.dev/llms.txt)——直接降低了 AI 读错文档的概率；
- React 是各主流 AI 编程工具模板的默认选项之一，npm 上 React 生态的包数量与示例密度最高（可用 [npm 官方搜索](https://www.npmjs.com/search?q=react)自行验证）；
- Dart/Flutter 语料虽也不少，但 UI 代码样板更长，小模型出错率更高。
对"AI 代写、用户只验收"的场景，**语料密度与文档机器可读性是第一生产力**，React 系两个候选都占优，Expo 在"文档对 LLM 友好"上做得最彻底。

---

## 2. 网页端本地持久化方案与移动端对应关系

### 2.1 网页端候选

| 技术 | 容量 | 特点 | 来源 |
| --- | --- | --- | --- |
| localStorage/sessionStorage | 每源合计约 **10 MiB**（各 5 MiB），超出抛 `QuotaExceededError` | 仅字符串键值对，同步 API，只适合设置项 | [MDN Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) |
| IndexedDB | Firefox best-effort 模式为磁盘 10%（上限 10 GiB/站点组），Chrome/Safari 更大 | 结构化存储 + 索引，浏览器主推的大容量方案 | [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)、[MDN Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) |
| OPFS + SQLite WASM | OPFS 属 File System API，配额同 IndexedDB 一套管理系统 | 真 SQL，但需 WASM + COOP/COEP 头，复杂度对 MVP 偏高 | [SQLite Wasm 官方文档](https://sqlite.org/wasm/doc/trunk/index.md)、[Chrome 官方博客](https://developer.chrome.com/blog/sqlite-wasm-in-the-browser-backed-by-the-origin-private-file-system) |
| **Dexie.js** | 同 IndexedDB | IndexedDB 的成熟封装：类型化表、链式查询、版本迁移，大幅降低手写 IndexedDB 的出错率 | [Dexie 官方文档](https://dexie.org/docs/Dexie.js) |

减脂助手的 MVP 数据（饮食记录、体重、目标、习惯打卡）是典型"结构化 + 中等量 + 需按日期/类型查询"的负载，IndexedDB 最为匹配；Dexie 在其上提供声明式 schema 与升级机制（[Dexie 文档](https://dexie.org/docs/Dexie.js)），正好是 AI 生成代码最不容易写错的一层。

**持久性注意**：默认存储是 best-effort 模式，磁盘紧张时可能被浏览器清理；可调用 `navigator.storage.persist()` 申请持久化，Chrome 团队数据表明"用户常访问的站点几乎不会被清理"（[MDN Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)）。MVP 阶段应在应用启动时申请持久化并提供"导出 JSON"兜底。

### 2.2 与移动端本地存储的对应关系

| 端 | 推荐存储 | 说明 |
| --- | --- | --- |
| Web（MVP） | IndexedDB / Dexie | 见上 |
| iOS/Android（Capacitor 壳） | 首选社区 SQLite 插件（如 [capacitor-sqlite](https://github.com/jepiqueau/capacitor-sqlite)），小数据用 [Preferences API](https://capacitorjs.com/docs/next/guides/storage) | Capacitor 官方明确警告：**iOS WebView 中 localStorage 必须视为临时存储、IndexedDB 在 iOS 同样可能被系统回收**，持久数据应使用原生侧存储（[Capacitor Storage 指南](https://capacitorjs.com/docs/next/guides/storage)） |
| iOS/Android（Expo 路线） | [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) | 官方维护的 SQLite 绑定，标注支持 Android/iOS |
| 桌面端（后置） | Electron/Tauri 复用 Web 代码 + IndexedDB 或 SQLite | 与 Web 同构，成本最低 |

**关键设计含义**：既然 Web 端是 Dexie、移动端大概率是 SQLite，数据层必须收敛到一个**存储抽象接口**（如 `FoodLogRepo` / `WeightRepo`），UI 只依赖接口——这是本方案里唯一需要一开始就做对的架构决策。

---

## 3. 推荐与风险

### 推荐：Vite + React PWA（Dexie/IndexedDB）+ 后置 Capacitor 打包移动端

**理由：**

1. **网页先行体验最好、最贴合验收节奏。** Vite 原生 ESM 开发服务器"启动几乎即时"（[官方中文文档](https://cn.vite.dev/guide/why)），`vite-plugin-pwa` 一行配置即可让应用可安装、可离线（[Vite PWA](https://vite-pwa-org.netlify.app/guide/)）；用户拿到的是一个"浏览器打开就能用、可加到主屏"的真 PWA，而不是某个跨端框架的 Web 适配层产物。
2. **MVP 无后端的约束下，React SPA 是复杂度下限。** Next.js 的 SSR/路由/数据获取能力在纯本地应用中没有收益（静态导出反而要绕开其服务端特性，[Next.js Static Exports](https://nextjs.org/docs/app/guides/static-exports)）；Vite + React 保留纯客户端模型，AI 生成代码的认知面最小。
3. **复用到 iOS/Android 的路径被官方文档直接覆盖。** Capacitor 的工作流就是为"已有 Vite Web 应用"设计的：`npm run build` → `npx cap sync` → `npx cap run ios/android`（[Capacitor Workflow](https://capacitorjs.com/docs/basics/workflow)），无需重写 UI。
4. **存储方案两端都有成熟官方/社区答案，且能共享一套领域模型。** Web 端 Dexie 提供声明式 schema 与版本迁移（[Dexie 文档](https://dexie.org/docs/Dexie.js)），移动端 Capacitor SQLite（[官方存储指南](https://capacitorjs.com/docs/next/guides/storage)）；只要先建好仓库层接口，切换成本低。
5. **中文资料与 LLM 语料双重占优。** Vite/React 官方中文文档齐全，React 生态示例密度最高；备选的 Expo 甚至提供面向 LLM 的全站 Markdown（[llms.txt](https://docs.expo.dev/llms.txt)），若最终走 Expo 路线，AI 读文档的可靠性也极高。

**主要风险（按优先级）：**

- **iOS 数据回收**：iOS WebView 中 IndexedDB/localStorage 可能被系统在磁盘紧张时清除（[Capacitor 官方警示](https://capacitorjs.com/docs/next/guides/storage)）。缓解：上架前迁移到原生 SQLite；Web 端调用 `navigator.storage.persist()`（[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)）。
- **无后端 = 无同步与备份**：用户换设备/清缓存即丢数据，与"减脂记录是长期资产"矛盾。缓解：MVP 就提供 JSON 导出/导入，为后续加云同步预留数据模型（记录带 UUID 与时间戳）。
- **App Store 上架**：Capacitor/Expo 出的原生壳需要 Mac 环境（或云构建服务如 EAS Build）与开发者账号；纯 PWA 在 iOS 上的安装入口较深，用户教育成本存在。
- **存储抽象若一开始不做，后期改造成本高**：Dexie 与 SQLite 的查询能力不完全对齐，领域层应只暴露"记录/查询/统计"级别的接口。
- **备选触发条件**：如果早期就确定"移动端是最终主战场、Web 只是过渡"，可直接选 Expo（三端同构 + expo-sqlite + 对 LLM 最友好的文档），接受网页端视觉受 RN Web 约束的代价。

---

## 附：来源清单（去重）

- Vite 官方中文文档《为什么选 Vite》：https://cn.vite.dev/guide/why
- Vite PWA 插件官方指南：https://vite-pwa-org.netlify.app/guide/ （简体中文版：https://vite-pwa-org-zh.netlify.app/guide/）
- Next.js 官方《Static Exports》：https://nextjs.org/docs/app/guides/static-exports
- Expo Router 官方介绍：https://docs.expo.dev/router/introduction/
- Expo LLM 文档索引：https://docs.expo.dev/llms.txt
- Expo SQLite 官方文档：https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo Distribution Overview（EAS Build/Submit）：https://docs.expo.dev/distribution/introduction/
- Expo Router 静态渲染：https://docs.expo.dev/router/web/static-rendering/
- Capacitor 官方《Development Workflow》：https://capacitorjs.com/docs/basics/workflow
- Capacitor 官方《Storage》指南：https://capacitorjs.com/docs/next/guides/storage
- Flutter 官方支持平台：https://docs.flutter.dev/reference/supported-platforms
- Flutter Web 渲染器：https://docs.flutter.dev/platform-integration/web/renderers
- MDN《Storage quotas and eviction criteria》：https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- MDN IndexedDB：https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- SQLite 官方 Wasm 文档：https://sqlite.org/wasm/doc/trunk/index.md
- Chrome for Developers 博客《SQLite Wasm in the browser backed by the Origin Private File System》：https://developer.chrome.com/blog/sqlite-wasm-in-the-browser-backed-by-the-origin-private-file-system
- Dexie.js 官方文档：https://dexie.org/docs/Dexie.js
- capacitor-sqlite（社区插件）：https://github.com/jepiqueau/capacitor-sqlite
