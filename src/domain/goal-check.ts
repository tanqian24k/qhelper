/**
 * 目标三态校验 —— spec §2.2（来自 05 号票）。保存目标时执行，返回单一结果：
 * 🔴 rejected（两种硬拒） / 🟡 warn（黄警，须用户确认才能保存） / 🟢 ok
 */
import { CALORIE_FLOOR, MAX_WEEKLY_RATE_KG, calcBmr, calcBudget, calcTdee } from './budget'
import type { ActivityKey, Sex } from './types'
import { localDateString } from '@/utils/date'

export type GoalCheckStatus = 'rejected' | 'warn' | 'ok'

export interface GoalCheckInput {
  sex: Sex
  age: number
  heightCm: number
  /** 当前体重（kg），取测量流最新日均值，onboarding 手填兜底 */
  weightKg: number
  activityKey: ActivityKey
  targetWeightKg: number
  weeklyRateKg: number
}

export interface GoalCheckResult {
  status: GoalCheckStatus
  bmr: number
  tdee: number
  budget: number
  /** 拒绝原因（rejected 时必有，简体中文面向用户） */
  reason?: string
  /** 黄警文案（warn 时必有） */
  warning?: string
}

/** 目标设定校验：速率上限 → 硬下限 → BMR 黄警线 → 通过 */
export function checkGoal(input: GoalCheckInput): GoalCheckResult {
  const bmr = calcBmr(input)
  const tdee = calcTdee(bmr, input.activityKey)
  const budget = calcBudget(tdee, input.weeklyRateKg)
  const floor = CALORIE_FLOOR[input.sex]

  // 🔴 拒绝 1：速率 > 1 kg/周
  if (input.weeklyRateKg > MAX_WEEKLY_RATE_KG) {
    return {
      status: 'rejected',
      bmr,
      tdee,
      budget,
      reason: '更快减重会流失肌肉且易反弹，请降低速率',
    }
  }

  // 🔴 拒绝 2：预算 < 安全下限
  if (budget < floor) {
    return {
      status: 'rejected',
      bmr,
      tdee,
      budget,
      reason: `按此速率算出的每日预算 ${budget} kcal 低于安全下限（${floor} kcal），请降低速率`,
    }
  }

  // 🟡 黄警：预算 < BMR 但 ≥ 下限，可继续（须点「我已了解黄警风险」）
  if (budget < bmr) {
    return {
      status: 'warn',
      bmr,
      tdee,
      budget,
      warning: `每日预算 ${budget} kcal 已低于基础代谢 ${bmr} kcal，长期低于基础代谢有健康风险`,
    }
  }

  // 🟢 通过
  return { status: 'ok', bmr, tdee, budget }
}

/** 预计达成日 = 剩余体重 ÷ 速率 × 7 天（返回 ISO 日期） */
export function estimateFinishDate(
  currentWeightKg: number,
  targetWeightKg: number,
  weeklyRateKg: number,
  from = new Date(),
): string {
  const remainingKg = currentWeightKg - targetWeightKg
  if (remainingKg <= 0 || weeklyRateKg <= 0) return ''
  const days = Math.ceil((remainingKg / weeklyRateKg) * 7)
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return localDateString(d)
}
