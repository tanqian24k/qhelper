# 16 - M3 · JSON 导出/导入（防丢失生命线）

Labels: ready-for-agent
Type: task
Spec: [spec.md](../spec.md) §2.7
Blocked by: 08 ✅

## Scope

1. 一键导出全部数据为 JSON：档案、目标版本、食物条目、测量、自定义食物、设置。
2. 导入恢复：文件选择 → 预览条数 → 确认后**整库替换**（清空后写入，保证一致性）。
3. 格式带 `schemaVersion` 与导出时间，为未来云同步/版本迁移预留。

## Accept

- [ ] 导出 JSON 可在另一浏览器导入并完整还原
- [ ] 清空站点数据前导出、清空后导入，数据无损

## Answer

（待实现）

## Answer

**完成（commit c7f152a）**：`src/repo/backup.ts`——导出六表全量（schemaVersion+exportedAt）、下载为 qhelper-backup-*.json；导入两步（parseImport 校验预览 → 单事务整库替换，坏文件不碰库）。4 个集成测试覆盖 spec §2.7 两条 Accept（含清空→导入无损、旧数据不残留）。UI 在设置页。
