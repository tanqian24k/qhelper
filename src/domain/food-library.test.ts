import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { FoodLibrary } from './types'

/**
 * 内置食物库数据质量门槛（spec §2.5，09 票 Accept）：
 * ≥300 条、<200KB、字段齐全、数值自洽、名称不重复。
 */
const raw = readFileSync(new URL('../data/food-library.json', import.meta.url), 'utf8')
const foods = JSON.parse(raw) as Array<Omit<FoodLibrary, 'id' | 'createdAt' | 'updatedAt'>>

describe('内置食物库数据', () => {
  it('条数 ≥300', () => {
    expect(foods.length).toBeGreaterThanOrEqual(300)
  })

  it('文件体量 <200KB', () => {
    expect(new TextEncoder().encode(raw).length).toBeLessThan(200 * 1024)
  })

  it('名称不重复', () => {
    const names = foods.map((f) => f.nameZh)
    expect(new Set(names).size).toBe(foods.length)
  })

  it('每条字段齐全且合法', () => {
    for (const f of foods) {
      expect(f.nameZh, JSON.stringify(f)).toBeTruthy()
      expect(['tfda', 'usda', 'manual']).toContain(f.source)
      expect(Array.isArray(f.nameAlias)).toBe(true)
      expect(f.category).toBeTruthy()
      expect(f.per100g.kcal).toBeGreaterThan(0)
      expect(f.per100g.kcal).toBeLessThan(900)
      expect(f.per100g.proteinG).toBeGreaterThanOrEqual(0)
      expect(f.per100g.fatG).toBeGreaterThanOrEqual(0)
      expect(f.per100g.carbG).toBeGreaterThanOrEqual(0)
      expect(f.editable).toBe(false)
    }
  })

  it('kcal 与三大宏量大致自洽（±15%）', () => {
    for (const f of foods) {
      const { kcal, proteinG, fatG, carbG } = f.per100g
      const derived = proteinG * 4 + carbG * 4 + fatG * 9
      // 高水分蔬菜纤维多，放宽到 ±40%
      const tolerance = kcal < 40 ? 0.4 : 0.15
      if (derived > 5) {
        expect(Math.abs(derived - kcal) / Math.max(kcal, derived), f.nameZh).toBeLessThan(tolerance)
      }
    }
  })
})
