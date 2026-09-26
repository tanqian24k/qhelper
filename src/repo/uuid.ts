/**
 * UUID 生成 —— 独立模块便于测试环境替换。
 * crypto.randomUUID 在所有目标浏览器（spec §6 兼容基线）均可用。
 */
export function randomUUID(): string {
  return crypto.randomUUID()
}
