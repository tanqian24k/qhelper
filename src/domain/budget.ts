/**
 * 热量计算链 —— spec §2.3，全部纯函数，UI 组件不写业务公式（spec §6 可维护性）。
 *
 * BMR  = Mifflin-St Jeor
 * TDEE = BMR × 活动系数
 * 缺口 = 每周速率(kg) × 1100   （1 kg 体脂 ≈ 7700 kcal）
 * 预算 = TDEE − 缺口（随目标版本固定，不随运动/停滞自动调整）
 */
import type { ActivityKey, Sex } from './types'
import { ACTIVITY_FACTORS } from './types'

/** 安全下限（硬）：女 1200 / 男 1500 kcal */
export const CALORIE_FLOOR: Record<Sex, number> = { female: 1200, male: 1500 }

/** 速率安全上限：kg/周 */
export const MAX_WEEKLY_RATE_KG = 1

/** 1 kg 体脂 ≈ 7700 kcal → 日缺口 = 速率 × 1100 */
export const KCAL_PER_KG_FAT = 7700
export const DEFICIT_PER_WEEK_PER_KG = KCAL_PER_KG_FAT / 7

export interface BmrInput {
  sex: Sex
  /** 年龄（由出生年份推算，调用方负责） */
  age: number
  /** 厘米 */
  heightCm: number
  /** 千克 */
  weightKg: number
}

/** Mifflin-St Jeor 基础代谢 */
export function calcBmr({ sex, age, heightCm, weightKg }: BmrInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

/** 每日总消耗 = BMR × 活动系数 */
export function calcTdee(bmr: number, activityKey: ActivityKey): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activityKey])
}

/**
 * 每日热量缺口 = 每周速率(kg) × 1100
 * （函数名保持 calcDailyDeficit：它返回**日**缺口，不是周缺口——早期叫 calcWeeklyDeficit 是误导）
 */
export function calcDailyDeficit(weeklyRateKg: number): number {
  return Math.round(weeklyRateKg * DEFICIT_PER_WEEK_PER_KG)
}

/** 每日热量预算 = TDEE − 日缺口 */
export function calcBudget(tdee: number, weeklyRateKg: number): number {
  return tdee - calcDailyDeficit(weeklyRateKg)
}

/** 由出生年份推算年龄（按当前年份粗算，够 MVP 用） */
export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return now.getFullYear() - birthYear
}
