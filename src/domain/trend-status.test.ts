import { describe, expect, it } from 'vitest'
import { dailyMeanSeries, weeklyMeans } from './measurements'
import { assessTrend } from './trend-status'
import type { Measurement } from './types'

function m(date: string, value: number): Measurement {
  return { id: date + value, date, type: 'weight', value, createdAt: date }
}

describe('dailyMeanSeries 日均值', () => {
  it('同日多条取均值，count>1（曲线 * 标记口径）', () => {
    const s = dailyMeanSeries([m('2026-03-01', 70.0), m('2026-03-01', 69.3), m('2026-03-02', 69.8)])
    expect(s).toEqual([
      { date: '2026-03-01', mean: 69.65, count: 2 },
      { date: '2026-03-02', mean: 69.8, count: 1 },
    ])
  })

  it('乱序输入输出仍按日期升序', () => {
    const s = dailyMeanSeries([m('2026-03-03', 69.5), m('2026-03-01', 70.0)])
    expect(s[0].date).toBe('2026-03-01')
    expect(s[1].date).toBe('2026-03-03')
  })
})

describe('weeklyMeans 周均', () => {
  it('跨月周正确归组（周一为周首）', () => {
    // 2026-03-01 是周日 → 属于 2026-02-23 那周；03-02 周一起新周
    const s = dailyMeanSeries([m('2026-03-01', 70), m('2026-03-02', 69), m('2026-03-03', 68)])
    const w = weeklyMeans(s)
    expect(w.length).toBe(2)
    expect(w[0].weekStart).toBe('2026-02-23')
    expect(w[1].weekStart).toBe('2026-03-02')
    expect(w[1].mean).toBeCloseTo(68.5, 5)
  })
})

describe('assessTrend 三色状态（spec §2.3 口径）', () => {
  // 构造周均序列的辅助：每周周一/周二各放一个同值点 → 周均 = 该值
  function seriesOf(weekMeans: number[]): ReturnType<typeof dailyMeanSeries> {
    const out: Measurement[] = []
    const starts = ['2026-02-02', '2026-02-09', '2026-02-16', '2026-02-23', '2026-03-02', '2026-03-09']
    weekMeans.forEach((v, i) => {
      const [y, mo, d] = starts[i].split('-').map(Number)
      const t1 = new Date(y, mo - 1, d)
      const t2 = new Date(y, mo - 1, d + 1)
      const fmt = (dt: Date) =>
        `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      out.push(m(fmt(t1), v))
      out.push(m(fmt(t2), v))
    })
    return dailyMeanSeries(out)
  }

  it('🟢 正常：−0.5 kg/周节奏', () => {
    const r = assessTrend(seriesOf([70, 69.5, 69, 68.5, 68]), 0.5)
    expect(r.status).toBe('normal')
  })

  it('🟠 偏快：周降 1.2 超预期 0.5+0.25', () => {
    const r = assessTrend(seriesOf([71, 70.3, 69.6, 68.4, 67.2]), 0.5)
    expect(r.status).toBe('fast')
    expect(r.message).toContain('偏快')
  })

  // 以下两条锁定「🟢/🟠 首尾相接、区间无空洞」：
  // 旧口径 🟠 需超 0.5，导致 (0.25, 0.5] 无任何状态归属；现两档共用 0.25 宽。
  it('🟢 边界：恰好等于预期−0.25（不判偏快）', () => {
    // 预期 0.5，阈值 -(0.5+0.25)=-0.75；周降恰好 -0.75 应归 🟢
    const r = assessTrend(seriesOf([71, 70.25, 69.5, 68.75, 68.0]), 0.5)
    expect(r.status).toBe('normal')
  })

  it('🟠 边界：略超预期−0.25（判偏快）', () => {
    // 周降 -0.8 < -0.75 → 判偏快（这正是旧口径下无人归属的区间）
    const r = assessTrend(seriesOf([71, 70.2, 69.4, 68.6, 67.8]), 0.5)
    expect(r.status).toBe('fast')
  })

  it('🔴 停滞：连续两周变化不足 25%（<0.125kg）', () => {
    const r = assessTrend(seriesOf([70, 69.8, 69.7, 69.65, 69.6]), 0.5)
    expect(r.status).toBe('stall')
    expect(r.message).toContain('连续两周')
  })

  it('上周停滞但本周恢复 → 不判停滞', () => {
    // 前 3 周慢，最后一周正常下降
    const s = dailyMeanSeries([
      m('2026-02-02', 70), m('2026-02-03', 70),
      m('2026-02-09', 69.9), m('2026-02-10', 69.9),
      m('2026-02-16', 69.8), m('2026-02-17', 69.8),
      m('2026-02-23', 69.7), m('2026-02-24', 69.7),
      m('2026-03-02', 69.2), m('2026-03-03', 69.2),
    ])
    const r = assessTrend(s, 0.5)
    expect(r.status).not.toBe('stall')
  })

  it('数据不足 3 周 → 正常态 + 引导文案', () => {
    const r = assessTrend(dailyMeanSeries([m('2026-03-01', 70), m('2026-03-08', 69.5)]), 0.5)
    expect(r.status).toBe('normal')
    expect(r.actualWeeklyChange).toBeNull()
    expect(r.message).toContain('3 周')
  })

  it('速率为 0（维持）→ 不评估缺口', () => {
    const r = assessTrend(seriesOf([70, 69.5, 69, 68.5, 68]), 0)
    expect(r.message).toContain('维持')
  })
})
