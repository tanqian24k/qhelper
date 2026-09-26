/**
 * 测量流领域函数 —— 日均值序列与周统计（spec §2.6）。
 * 全部纯函数，UI 不做数据聚合。
 */
import type { Measurement } from './types'

export interface DailyPoint {
  date: string
  /** 日均值 */
  mean: number
  /** 当日原始记录条数（>1 时曲线点带 * 标记） */
  count: number
}

/** 按日期聚合日均值，日期升序。 */
export function dailyMeanSeries(measurements: Measurement[]): DailyPoint[] {
  const byDate = new Map<string, { sum: number; count: number }>()
  for (const m of measurements) {
    const cur = byDate.get(m.date) ?? { sum: 0, count: 0 }
    cur.sum += m.value
    cur.count += 1
    byDate.set(m.date, cur)
  }
  return [...byDate.entries()]
    .map(([date, { sum, count }]) => ({ date, mean: sum / count, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface WeekPoint {
  /** 周起始日期（周一） */
  weekStart: string
  /** 该周有均值记录的日数 */
  days: number
  /** 该周日均均值（周均体重） */
  mean: number
}

/** ISO 周一日期串 */
function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const day = (dt.getDay() + 6) % 7 // 周一=0
  dt.setDate(dt.getDate() - day)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** 日均值序列 → 周均序列（周内均值再均值），周升序。 */
export function weeklyMeans(series: DailyPoint[]): WeekPoint[] {
  const byWeek = new Map<string, { sum: number; days: number }>()
  for (const p of series) {
    const wk = mondayOf(p.date)
    const cur = byWeek.get(wk) ?? { sum: 0, days: 0 }
    cur.sum += p.mean
    cur.days += 1
    byWeek.set(wk, cur)
  }
  return [...byWeek.entries()]
    .map(([weekStart, { sum, days }]) => ({ weekStart, days, mean: sum / days }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}
