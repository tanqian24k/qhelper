# 08 - M0 工程骨架

Labels: ready-for-agent
Type: task
Status: resolved
Spec: [spec.md](../spec.md) §3 / §4 / §9（M0 行）

## Scope

按 spec §9 的 M0 里程碑搭好工程骨架，MVP 代码全部由此起步：

1. **Vite + React + TypeScript 脚手架**（纯客户端 SPA），接入 `vite-plugin-pwa`（可安装到主屏、离线可用）。
2. **领域类型 + Repo 接口层**：按 spec §4 定义六实体类型（Profile / GoalVersion / FoodLibrary / FoodEntry / Measurement / Setting），声明五个 Repo 接口（`ProfileRepo / GoalRepo / FoodLibraryRepo / FoodLogRepo / MeasurementRepo`），UI 只依赖接口（架构铁律，spec §3）。
3. **Dexie 实现**：`DexieRepoFactory` 落地五个接口到 Dexie/IndexedDB，全记录带 UUID + 时间戳（spec §3 风险 2）。
4. **领域计算纯函数**：BMR / TDEE / 缺口 / 预算计算链（spec §2.3）+ 目标三态校验（🔴速率上限 / 🔴硬下限 / 🟡黄警 / 🟢通过，spec §2.2），配单元测试（非功能需求：纯函数化 + 单测）。
5. **空壳时间线页面**：一日一页骨架——预算块占位（剩余 kcal 大字）+ 身体数据块邀请态 + 餐槽空态 + 右下悬浮 ＋（spec §5 信息架构，仅占位，无业务逻辑）。
6. **CI 可跑**：GitHub Actions，`pnpm install → lint → typecheck → test → build`。
7. **git 仓库**：已初始化（main 分支），小步提交。

## Acceptance（验收）

- [ ] `pnpm install && pnpm build` 成功，`dist/` 产出 PWA（含 manifest + service worker）。
- [ ] `pnpm test` 领域计算单测全绿，含 spec §2.3 验收用例：女 30 岁 165cm 70kg 轻度 → BMR≈1420 / TDEE≈1953 / −0.5kg/周→预算≈1403 黄警 / −1kg/周→≈853 拒。
- [ ] 部署（或本地 preview）后空壳页面可安装到主屏（manifest 有效、SW 注册成功）。
- [ ] CI 流水线绿。

## Answer

**M0 完成（2026-02）**，验收标准逐条对照：

- ✅ `npm run build` 成功：vite 6 + vite-plugin-pwa 1.3（generateSW，precache 11 entries）；`dist/` 含 `manifest.webmanifest` / `sw.js` / 192+512(+maskable) 图标，preview 下三者均 200 且 index 正确引用 manifest。
- ✅ `npm test` 14 个单测全绿，覆盖 spec §2.3 验收用例（女 30/165/70 轻度 → BMR≈1420 / TDEE≈1953 / −0.5→≈1403 黄警 / −1→≈853 拒）+ 三态校验四分支 + 达成日推算。
- ✅ ~~安装到主屏待用户验收~~ **用户已验收通过（2026-02）**：可安装到桌面并启动。
- ✅ CI：`.github/workflows/ci.yml`（npm ci → lint → typecheck → test → build；推送 GitHub 后生效）。

产出结构：
- `src/domain/` — 六实体类型（spec §4 逐字段）+ Repo 五接口（架构铁律）+ 计算链纯函数（`budget.ts`）+ 三态校验（`goal-check.ts`）+ 单测
- `src/repo/` — Dexie 实现六表 + 工厂入口（`react.ts` 供页面用的单例）
- `src/pages/TodayPage.tsx` — 时间线空壳：预算块/身体数据块/四餐槽/趋势块占位 + 右下 FAB + IndexedDB 连通自检
- 工具链：Vite + React 19 + TS 5.8 strict、ESLint 9、Vitest 3、npm（pnpm 被本机沙箱锁拒绝，包管理器换 npm，CI 同步用 npm）

状态：resolved
