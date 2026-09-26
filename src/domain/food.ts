/**
 * 食物营养换算 —— spec §6：UI 组件不写业务公式，统一走这里。
 */
import type { Per100g } from './types'

/** 每 100g 值 × 克数 → 热量（kcal，四舍五入） */
export function kcalOfFood(per100g: Per100g, grams: number): number {
  return Math.round((per100g.kcal * grams) / 100)
}

/** 手改热量 → 反推克数显示（spec §2.4：改热量则反推克数，克数仍是真值） */
export function gramsFromKcal(per100g: Per100g, kcal: number): number {
  if (per100g.kcal <= 0) return 0
  return Math.round((kcal / per100g.kcal) * 100 * 10) / 10
}
