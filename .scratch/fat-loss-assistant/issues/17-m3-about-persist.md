# 17 - M3 · 关于页 + 持久存储

Labels: ready-for-agent
Type: task
Spec: [spec.md](../spec.md) §2.5（署名）/ §2.7（隐私基线）/ 01 号票（persist）
Blocked by: 08 ✅

## Scope

1. 关于页：两个数据来源及许可条款署名（[food-library-source-notes.md](../research/food-library-source-notes.md) 的署名表格）；隐私说明（仅存本机、无账号/追踪/第三方 SDK）。
2. 启动时调用 `navigator.storage.persist()` 申请持久存储（iOS 可能回收未持久化的 IndexedDB）。
3. 关于页显示当前持久化状态。

## Accept

- [ ] 关于页可见署名 + 隐私说明
- [ ] persist() 在启动时申请，状态可见

## Answer

（待实现）
