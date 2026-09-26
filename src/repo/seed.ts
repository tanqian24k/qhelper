/**
 * 首次启动导入内置食物库 —— spec §2.5：JSON 内置、离线可用、与自定义食物同构存储。
 * 幂等：仅当库为空时导入（M3 导入/导出后再评估版本化更新）。
 */
import libraryJson from '@/data/food-library.json'
import type { FoodLibrary } from '@/domain/types'
import type { Repos } from '@/domain/repos'

type RawFood = Omit<FoodLibrary, 'id' | 'createdAt' | 'updatedAt'>

export const BUILTIN_LIBRARY: RawFood[] = libraryJson as RawFood[]
export const LIBRARY_SOURCES = {
  tfda: '台湾卫福部食药署 食品营养成分资料库（政府资料开放授权条款第 1 版）',
  usda: 'USDA FoodData Central SR Legacy（CC0 / 公有领域）',
  manual: '常见菜肴估算值（本应用整理，仅供参考）',
} as const

/** 库为空时导入内置数据（幂等）。返回导入条数。 */
export async function seedFoodLibrary(repos: Repos): Promise<number> {
  const existing = await repos.foodLibrary.count()
  if (existing > 0) return 0
  let seeded = 0
  for (const [i, food] of BUILTIN_LIBRARY.entries()) {
    await repos.foodLibrary.add({
      ...food,
      id: `builtin-${String(i + 1).padStart(4, '0')}`,
    } as Parameters<Repos['foodLibrary']['add']>[0])
    seeded++
  }
  return seeded
}
