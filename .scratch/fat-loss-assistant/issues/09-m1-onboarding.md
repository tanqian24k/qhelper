# 09 - M1 · onboarding 与档案

Labels: ready-for-agent
Type: task
Status: resolved
Spec: [spec.md](../spec.md) §2.1 / §2.3 / §9（M1 行）
Blocked by: 08 ✅

## Scope

1. 首次启动引导：性别（男/女）、出生年份、身高 cm、活动系数四档单选、当前体重（可跳过）、饮食偏好（选填）——四项必填未完成不能进入主界面。
2. 档案可随时在设置中修改；修改性别/年龄/身高/活动档位后 BMR/TDEE/预算立即重算。
3. 体重字段落 Measurement 流（type=weight），档案只存 BMR 基础四项（CONTEXT.md Profile 词条口径）。

## Accept

- [ ] 四必填未填无法进入主界面
- [ ] 改档案后预算重算（配验收用例：女 30/165/70 轻度 → 预算块联动）

## Answer

**完成（commit a5b35b1）**：
- `src/pages/OnboardingPage.tsx`：四必填校验（性别/出生年份/身高/活动档位），体重可跳过，偏好选填；四必填未完成按钮禁用。
- 初始体重落测量流（type=weight），档案失败不产生孤儿数据（评审建议修 2 已采纳：先存档案再落体重，失败有错误提示）。
- 档案修改走 `ProfileDialog`，保存后预算立即重算（reload 重算链）。
- 无体重时预算块显示「⚠ 未记录体重，暂按 70kg 估算」（评审必须修 7）。

状态：resolved
