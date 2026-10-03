/**
 * 目标达成/过期判定 —— spec §2.2 维持模式（CONTEXT.md MaintainMode）。
 *
 * 维持模式的口径「不设热量缺口、预算 = TDEE」由调用方达成
 * （无开放目标时预算即等于 TDEE，见 TodayPage 的 `goal ? calcBudget(...) : tdee`）。
 * 本模块只负责**判定与文案**，不改账、不写任何数据。
 */

/** 达成容差：日均值 ≤ 目标体重 + 此值即视为达成（贴身目标时体重有水分波动，卡死会反复误报） */
export const ACHIEVED_TOLERANCE_KG = 0.5

/** 过期提醒提前量：超过预计达成日此天数后提示（避免当天才说「过期」） */
export const OVERDUE_GRACE_DAYS = 7

/** 今日距预计达成日的天数差（正 = 已过预计日，负 = 尚未到）；算不出返回 null */
export function daysFromFinish(today: string, finishDate: string): number | null {
  if (!finishDate) return null
  const a = Date.parse(`${today}T00:00:00`)
  const b = Date.parse(`${finishDate}T00:00:00`)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((a - b) / 86_400_000)
}

export type GoalState = 'active' | 'achieved' | 'overdue'

export interface GoalStateResult {
  state: GoalState
  /** 面向用户的简体中文说明；active 时为 '' */
  message: string
}

export interface GoalStateInput {
  /** 目标体重（kg） */
  targetWeightKg: number
  /** 当前最新体重日均值（kg）；无体重记录时传 null（不足以判定达成） */
  currentWeightKg: number | null
  /** 预计达成日（yyyy-mm-dd）；算不出时传 '' */
  finishDate: string
  /** 今日（yyyy-mm-dd，本地日期） */
  today: string
}

/**
 * 目标状态判定，优先级：达成 > 过期 > 进行中。
 * 达成优先于过期——已达成即目标完成，此时再提示「过期」没有意义。
 */
export function assessGoalState({ targetWeightKg, currentWeightKg, finishDate, today }: GoalStateInput): GoalStateResult {
  // 达成：有体重记录且日均值 ≤ 目标 + 容差
  if (currentWeightKg !== null && currentWeightKg <= targetWeightKg + ACHIEVED_TOLERANCE_KG) {
    return {
      state: 'achieved',
      message: `已达成目标（${currentWeightKg.toFixed(1)} kg ≤ ${targetWeightKg.toFixed(1)} kg + ${ACHIEVED_TOLERANCE_KG} 容差），进入维持模式：不再设缺口，预算回到 TDEE。`,
    }
  }

  // 过期：今日已过预计达成日 + 宽限期，且尚未达成
  const d = daysFromFinish(today, finishDate)
  if (d !== null && d > OVERDUE_GRACE_DAYS) {
    return {
      state: 'overdue',
      message: `已超过预计达成日 ${finishDate} 约 ${d} 天。可复核记录完整性、活动档位与目标是否仍然现实。`,
    }
  }

  return { state: 'active', message: '' }
}