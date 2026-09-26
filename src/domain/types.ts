/**
 * 领域实体类型定义 —— 与 spec §4 数据模型逐字段对应。
 * 所有记录带 UUID + 时间戳（spec §3 风险 2：为未来云同步预留）。
 * 术语以仓库根 CONTEXT.md 为准。
 */

/** 性别（BMR 公式分支用） */
export type Sex = 'male' | 'female'

/** 活动系数档位（TDEE = BMR × 系数） */
export type ActivityKey = 'sedentary' | 'light' | 'moderate' | 'high'

/** 档位 → 系数（spec §2.3） */
export const ACTIVITY_FACTORS: Record<ActivityKey, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
}

/** 档位显示名（简体中文） */
export const ACTIVITY_LABELS: Record<ActivityKey, string> = {
  sedentary: '久坐',
  light: '轻度',
  moderate: '中度',
  high: '高',
}

/** 餐槽（每日四组） */
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'] as const

/** 餐槽显示名 */
export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐',
}

/** 每 100g 营养值（存储真值口径） */
export interface Per100g {
  /** 千卡 */
  kcal: number
  /** 克 */
  proteinG: number
  /** 克 */
  fatG: number
  /** 克 */
  carbG: number
  /** 克 */
  fiberG: number
  /** 克 */
  sugarG: number
  /** 毫克 */
  sodiumMg: number
}

/** 食物库来源 */
export type FoodSource = 'tfda' | 'usda' | 'manual'

/** 食物库条目 —— 内置与用户自定义同构（spec §2.5） */
export interface FoodLibrary {
  id: string
  /** 简体中文名 */
  nameZh: string
  /** 别名（含拼音检索串） */
  nameAlias: string[]
  category: string
  source: FoodSource
  per100g: Per100g
  /** 默认份型（如「1 碗 ≈ 250g」） */
  defaultPortion?: { label: string; grams: number }
  /** 内置库条目不可编辑 */
  editable: boolean
  createdAt: string
  updatedAt: string
}

/** 食物条目快照 —— 录入时对 FoodLibrary 的值拷贝，非引用（spec §4） */
export interface FoodEntrySnapshot {
  nameZh: string
  per100g: Per100g
}

/** 食物条目 —— 挂在某日某餐槽下的一条饮食记录 */
export interface FoodEntry {
  id: string
  /** ISO 日期 yyyy-mm-dd（本地日期，非时间戳） */
  date: string
  slot: MealSlot
  snapshot: FoodEntrySnapshot
  /** 克数是存储真值；kcal 按 per100g × grams 换算，可手改（改热量反推克数） */
  grams: number
  kcal: number
  createdAt: string
  updatedAt: string
}

/** 用户档案（单例）—— onboarding 一次性填写 */
export interface Profile {
  id: 'profile'
  sex: Sex
  /** 出生年份，推算年龄用 */
  birthYear: number
  /** 厘米 */
  heightCm: number
  activityKey: ActivityKey
  /** 饮食偏好自由文本，为 AI 教练预留，MVP 不参与计算 */
  prefs?: string
  createdAt: string
  updatedAt: string
}

/** 目标版本 —— 修改目标 = 封存旧版本 + 生效新版本 */
export interface GoalVersion {
  id: string
  /** 千克 */
  targetWeightKg: number
  /** 每周减重速率，千克/周（安全上限 1） */
  weeklyRateKg: number
  /** 非空即封存；有且仅有一个开放版本 */
  closedOn?: string
  createdAt: string
}

/** 测量类型（加新指标零改表） */
export type MeasurementType = 'weight' | 'bodyfat' | 'waist' | 'hip'

/** 身体测量 —— 同日同类型多条合法，曲线/评估用日均值 */
export interface Measurement {
  id: string
  date: string
  type: MeasurementType
  value: number
  createdAt: string
}

/** 杂项设置（如导出提醒、黄警确认记录） */
export interface Setting {
  key: string
  value: unknown
}
