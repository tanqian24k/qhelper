# 01 - 跨平台框架选型（网页先行，移动次之，桌面后置）

Labels: wayfinder:research
Type: research
Status: resolved

## Question

在「AI 代写代码、用户仅验收」的约束下，哪个跨平台框架最适合这个减脂助手 App？

已固定的背景：网页端先行（浏览器即用），之后 iOS/Android，桌面端后置；一套代码跨端优先；MVP 纯本地存储（无后端）；界面中文；用户无编程经验，规格将交给 AI agent 执行。

需要回答：

1. Flutter、React Native(+Expo)、PWA/纯 Web（如 React/Vue/Svelte + 响应式）等方案，在「网页先行 → 移动端复用」路径下各自的优劣（本地存储能力、中文生态、AI 代码生成友好度）。
2. 网页端的本地持久化方案（IndexedDB / OPFS / SQLite-WASM）与后续移动端本地库的对应关系。
3. 给出一个明确推荐 + 理由（考虑 AI agent 写代码的成功率与可维护性）。

## Blocked by

（无 —— 前沿票）

## Answer

**推荐：Vite + React 纯客户端 SPA + vite-plugin-pwa（PWA 化），本地存储 Dexie（IndexedDB）；后续用 Capacitor 把同一套 Web 代码打包 iOS/Android，移动端数据层迁移到原生 SQLite（capacitor-sqlite）。**

- 备选：Expo（RN + react-native-web + expo-sqlite）三端同构、官方文档专为 LLM 提供 Markdown 版（llms.txt），AI 代写最友好；若「移动端才是主战场、Web 只是过渡」可改选 Expo。Flutter 因 Web 端 CanvasKit 自绘渲染与「浏览器即用」目标相性差，不推荐。
- 存储要点：localStorage 每源约 10 MiB 上限，不够用；IndexedDB 配额大且支持索引查询，配 Dexie 降低出错率；MVP 应调用 `navigator.storage.persist()` + 提供 JSON 导出/导入兜底。iOS WebView 中 IndexedDB/localStorage 可能被系统回收，上移动端必须换原生 SQLite。
- **关键架构决策**：Web 用 Dexie / 移动用 SQLite 不一致，必须一开始就做存储抽象层（Repo 接口），UI 只依赖接口。
- 主要风险：iOS 数据回收、MVP 无同步（换设备丢数据，尽早做导出/导入）、App Store 上架需 Mac/云构建与开发者账号。

完整报告（含五维对比表、存储方案对照、约 18 个一手来源）：[research/01-framework.md](../research/01-framework.md)
