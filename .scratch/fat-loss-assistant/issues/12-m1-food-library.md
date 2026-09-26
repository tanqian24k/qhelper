# 12 - M1 · 内置食物库首批数据

Labels: ready-for-agent
Type: task
Status: claimed
Spec: [spec.md](../spec.md) §2.5
Blocked by: 08 ✅

## Scope

构建 ≥300 条常见中式食物的简体精选库：JSON 内置 <200KB、完全离线、最小字段集（spec §2.5）。数据来源合规红线：台湾食药署（政府开放授权 v1）+ USDA SR Legacy（CC0）补缺校验；⛔ 禁用《中国食物成分表》与香港 NIIS。高频菜肴/外卖条目 `source=manual` 标注「估算」。

## Accept

- [ ] ≥300 条，字段集齐全，体量 <200KB
- [ ] 首次启动导入 Dexie，与自定义食物同列表检索
- [ ] 关于页（M3）署名——本票先在数据 JSON 附 source 与 license 字段

## Answer

（待实现）
