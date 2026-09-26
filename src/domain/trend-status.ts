/**
 * 三色状态判定 —— spec §2.3 平台期反馈 + CONTEXT.md TrendStatus。
 * 只提示不改账：本模块永不写预算。
 */
import type { DailyPoint } from './measurements'
import { weeklyMeans } from './measurements'

export type TrendStatus = 'normal' | 'fast' | 'stall'

export interface TrendAssessment {
  status: TrendStatus
  /** 面向用户的简体中文说明 */
  message: string
  /** 最近一周实际变化（kg/周）；数据不足为 null */
  actualWeeklyChange: number | null
}

/** 判定所需最少数据：≥3 周（停滞要连看两周） */
const MIN_WEEKS = 3

/** 周变化 = 相邻两周周均体重之差（负值 = 下降） */
export function assessTrend(series: DailyPoint[], expectedWeeklyRateKg: number): TrendAssessment {
  const weeks = weeklyMeans(series)
  if (weeks.length < MIN_WEEKS || expectedWeeklyRateKg <= 0) {
    return {
      status: 'normal',
      message: weeks.length < MIN_WEEKS ? '打卡满 3 周后开始对比预期速率' : '维持模式不评估缺口',
      actualWeeklyChange: null,
    }
  }
  const last = weeks[weeks.length - 1]
  const prev = weeks[weeks.length - 2]
  const change = last.mean - prev.mean // 负 = 降

  // 🟠 偏快：下降快于预期超 0.5 kg/周
  if (change < -(expectedWeeklyRateKg + 0.5)) {
    return {
      status: 'fast',
      message: '最近一周下降偏快，掉太快需关注营养与力量训练',
      actualWeeklyChange: change,
    }
  }

  // 🔴 停滞：连续两周下降不足预期的 25%
  const weekBefore = weeks[weeks.length - 3]
  const changePrev = prev.mean - weekBefore.mean
  const stallThis = change > -expectedWeeklyRateKg * 0.25
  const stallPrev = changePrev > -expectedWeeklyRateKg * 0.25
  if (stallThis && stallPrev) {
    return {
      status: 'stall',
      message: '连续两周变化不足预期的 25%，建议复核记录完整性与活动档位',
      actualWeeklyChange: change,
    }
  }

  // 🟢 正常（含预期 ±0.25 内）
  return {
    status: 'normal',
    message: '进度正常，保持当前节奏',
    actualWeeklyChange: change,
  }
}
