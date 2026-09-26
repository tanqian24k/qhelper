# 12 - M1 · 内置食物库首批数据

Labels: ready-for-agent
Type: task
Status: resolved
Spec: [spec.md](../spec.md) §2.5
Blocked by: 08 ✅

## Scope

构建 ≥300 条常见中式食物的简体精选库：JSON 内置 <200KB、完全离线、最小字段集（spec §2.5）。数据来源合规红线：台湾食药署（政府开放授权 v1）+ USDA SR Legacy（CC0）补缺校验；⛔ 禁用《中国食物成分表》与香港 NIIS。高频菜肴/外卖条目 `source=manual` 标注「估算」。

## Accept

- [ ] ≥300 条，字段集齐全，体量 <200KB
- [ ] 首次启动导入 Dexie，与自定义食物同列表检索
- [ ] 关于页（M3）署名——本票先在数据 JSON 附 source 与 license 字段

## Answer

**完成（commit a5b35b1）**：
- `src/data/food-library.json`：**339 条，约 97 KB**（<200KB），主食/蔬菜/水果/鱼肉蛋豆/豆奶/油脂调味/坚果零食/饮品/菜肴 九类覆盖。
- 来源：tfda（基础食材）+ usda（补缺）+ manual（菜肴估算，带 estimateNote，UI 显示「估算」标签）；⛔ 合规红线遵守（未用《中国食物成分表》/香港 NIIS）。署名说明：[food-library-source-notes.md](../research/food-library-source-notes.md)。
- 质量门槛自动化：`food-library.test.ts` 5 项（条数/体量/重复/字段/宏量自洽）。
- 首启导入：`seedFoodLibrary` 在 `useAppBootstrap` 调用（幂等，仅空库导入）（评审必须修 2）。
- 搜索：名称+别名（含拼音）匹配。

状态：resolved
