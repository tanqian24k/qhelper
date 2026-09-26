# 10 - M1 · 目标设定（三态校验弹窗）

Labels: ready-for-agent
Type: task
Status: resolved
Spec: [spec.md](../spec.md) §2.2 / §2.3
Blocked by: 08 ✅

## Scope

1. 目标 = 目标体重 + 每周速率；预计达成日自动推算（`estimateFinishDate` 已有）。
2. 编辑统一弹窗，红拦/黄警/绿过**实时预览**（06 号票结论 4）：输入变化即调 `checkGoal`。
3. 🔴 速率 >1kg/周、🔴 预算 < 硬下限 → 拒存；🟡 预算 < BMR ≥ 下限 → 黄条 +「我已了解黄警风险」勾选后可存；🟢 显示预算与达成日。
4. 保存 = `GoalRepo.openNew`（封存旧版本 + 生效新版本）；历史版本列表可查（设置页入口）。
5. 维持模式：速率 0 或无开放目标 → 预算 = TDEE（M1 先支持「无目标显示引导」，维持模式引导 M2 补）。

## Accept

- [ ] −1.5kg/周被拒；女 30/165/70 轻度 −0.5 → 黄警可继续；−1 → 硬下限拒
- [ ] 修改目标后历史版本 +1

## Answer

**完成（commit a5b35b1）**：
- `src/pages/GoalDialog.tsx`：输入防抖 150ms 实时调 `checkGoal`；🔴 红卡（两种拒因）不可保存；🟡 黄卡 + 「我已了解黄警风险」勾选后可保存；🟢 绿卡显示预算 + 达成日。
- 保存走 `GoalRepo.openNew`（事务封存旧版本）；`GoalHistoryDialog` 提供历史版本列表（评审必须修 8）。
- 速率预设 −0.25/−0.5/−0.75/−1 快捷按钮。

状态：resolved
