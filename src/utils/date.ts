/**
 * 本地日期工具 —— 全应用日期口径统一：yyyy-mm-dd 按**本地时区**拼装。
 * 禁用 toISOString().slice(0,10)（UTC，+08 时区凌晨 0–8 点会错一天）。
 */
export function localDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr(): string {
  return localDateString(new Date())
}

/** 日期平移 N 天（跨月/跨年安全） */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return localDateString(new Date(y, m - 1, d + days))
}
