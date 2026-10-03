# Map: 实现地图 — MVP 收尾与 M4

Labels: wayfinder:map
Status: active

## Destination

把 [spec.md](spec.md) 的 MVP 与 M4 交付到一个**文档与实现一致、CI 全绿**的状态：规格声明的每一条验收都能在代码里指出位置，实现欠下的债逐条销账，并为 v1.5 趋势报表留下可接手的地基。

配套背景（不重复）：[map.md](map.md) 是已封存的规划图，记录「为什么做这些决策」。

## Notes

- **开发方式（关键约束）**：用户无编程经验，由 AI 代写代码、用户负责验收和决策。
- 平台：网页先行 + Android 原生壳（M4）；iOS 未发布。
- 界面中文；度量 kg / kcal（斤换算是可选显示项，见 CONTEXT.md「单位口径」，非 DoD）。
- 数据：纯本地存储，无后端；无账号、无追踪、无第三方 SDK。
- **架构铁律**：UI 只依赖 `domain/repos.ts` 的六个 Repo 接口；Dexie（Web）与 capacitor-sqlite（原生）的差异只存在于实现层。改动数据层时两套实现都要过同一组契约测试（[src/repo/contract.test.ts](../../src/repo/contract.test.ts)）。
- 领域术语以仓库根 [CONTEXT.md](../../../CONTEXT.md) 为准，术语变更须同步改 CONTEXT.md 与 spec。

## 状态

**M0–M3 已完成并经用户验收；M4 已交付 Android 壳。** 2026-06 的一次 grilling 对账发现 9 处「文档比实现乐观」的差异，全部已修复（见 Decisions so far）。

当前验证基线（2026-06 实跑）：

| 检查 | 结果 |
|---|---|
| `npm run typecheck` | 通过 |
| `npm run lint` | 通过（此前因 `android/` 构建产物未排除而失败） |
| `npm test` | 64 通过 / 7 文件 |
| `npm run build`（网页版） | 通过，precache 12 entries，`sw.js` + `manifest.webmanifest` 正常产出 |

## Decisions so far

2026-06 对账 grilling（逐项裁决已落地）：

1. **CI 修复**：`eslint.config.js` 的 `globalIgnores` 补 `android`，构建产物不再进入 lint。DoD 的「全绿」此前在字面成立、事实上不成立。
2. **日期口径统一**：`closedOn` 与 `estimateFinishDate` 改用 `utils/date.ts` 的本地日期口径（此前用被该文件明令禁用的 `toISOString().slice(0,10)`，+08 凌晨会错一天）。
3. **三色状态闭区间**：🟠「偏快」阈值由「超 0.5」改为「超 0.25」，与 🟢 首尾相接，消除原口径 (0.25, 0.5] 无归属的空洞；在任何预期速率下偏快警告都更早触发。CONTEXT.md 已同步。
4. **维持模式只做状态提示**：达成 = 体重日均值 ≤ 目标 + 0.5kg 容差；过期 = 超预计达成日 + 7 天宽限；达成优先于过期。不自动改预算、不写库。预算回到 TDEE 的口径本就已由 `goal ? calcBudget(...) : tdee` 隐式达成。
5. **补齐两项验收缺口**：自定义食物新增/编辑/删除 UI（spec §2.5 验收原文要求，此前 Repo 有实现零 UI 调用）；已记条目编辑（spec §2.4「补/改/删」的「改」）。两者均有集成测试。
6. **存储双后端**：Web 保留 Dexie/IndexedDB，原生壳走 capacitor-sqlite，按 `Capacitor.isNativePlatform()` 在 `src/repo/index.ts` 分流。新增 Repo 契约测试锁住两套实现的语义一致性。**iOS 仍未验证**（见 Not yet specified）。
7. **文档重组**：本规划图封存为决策档案，实现进度迁至本图；spec §7 DoD 按真实实现重写。

## 待办（按优先级）

- **iOS 真机验证**（spec §3 风险 1）：在真 iOS 设备装 PWA、记数天数据，观察 IndexedDB 是否被系统回收。结论决定 iOS 是否走 SQLite。
- **原生 SQLite 端到端验证**：`contract.test.ts` 目前只注入 Dexie；SQLite 分支需在真机/模拟器上跑同一组用例（CI 无原生桥）。
- **食物库常用条目置顶**：spec §2.5 要求「常用条目置顶」，`dexie-repos.ts` 的 search 注释承诺了但代码只是 `slice`，无排序。
- **v1.5 趋势报表**：实现前按 spec §8 补一次 grilling（周/月报、摄入达标率、分餐占比）。
- **v2.0 AI 教练**：交互与 prompt 设计仍是雾区，启动前补 grilling。

## Not yet specified

- 云同步 / 多设备：MVP 纯本地；手机端与网页端数据如何互通尚未定义（原生迁 SQLite 后，两端数据彼此独立，这一点需要在做云同步前明确）。
- iOS 发布路径：是否上架、是否需要开发者账号与 Mac 构建，均未定。
- v1.5 报表、v2.0 教练的交互设计（见上「待办」）。

## Out of scope

- 拍照识别食物、动态热量预算自动调整（map 规划图已判定不选入路线图）。
- 账号体系、支付、商业化（个人自用/小范围定位）。
- 桌面端（Tauri/Electron，远期候选）。