import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GoalVersion, Measurement } from '@/domain/types'
import type { Repos } from '@/domain/repos'
import { dailyMeanSeries, type DailyPoint } from '@/domain/measurements'
import { assessTrend, type TrendAssessment } from '@/domain/trend-status'
import { MeasurementDialog } from './MeasurementDialog'
import { useEscape } from '@/hooks/useEscape'
import { todayStr } from '@/utils/date'

export interface TrendPageProps {
  repos: Repos
}

type Range = 30 | 90 | 0 // 0 = 全部

const STATUS_META = {
  normal: { icon: '🟢', cls: 'check-ok' },
  fast: { icon: '🟠', cls: 'check-warn' },
  stall: { icon: '🔴', cls: 'check-rejected' },
} as const

/** 单日原始记录弹层 */
function DayDetailDialog({ repos, point, onClose, onChanged }: {
  repos: Repos
  point: DailyPoint
  onClose: () => void
  onChanged: () => void
}) {
  const [records, setRecords] = useState<Measurement[]>([])
  useEscape(onClose)

  useEffect(() => {
    void repos.measurement.listByDateAndType(point.date, 'weight').then(setRecords)
  }, [repos, point.date])

  async function remove(id: string) {
    await repos.measurement.remove(id)
    onChanged()
    const list = await repos.measurement.listByDateAndType(point.date, 'weight')
    setRecords(list)
    if (list.length === 0) onClose()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${point.date} 体重记录`}>
        <h2 className="dialog-title">{point.date} 的体重记录</h2>
        <p className="card-hint">日均值 {point.mean.toFixed(2)} kg（{point.count} 条{point.count > 1 ? '，图中带 *' : ''}）</p>
        <ul className="history-list">
          {records.map((r) => (
            <li key={r.id} className="history-item">
              <span className="history-main">{r.value} kg</span>
              <button className="btn-link" onClick={() => remove(r.id)}>删除</button>
            </li>
          ))}
        </ul>
        <div className="dialog-actions">
          <button className="btn-ghost" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}

/** 趋势页 —— spec §2.6：体重曲线（日均值 + * 标记）+ 三色状态 */
export function TrendPage({ repos }: TrendPageProps) {
  const [points, setPoints] = useState<DailyPoint[]>([])
  const [goal, setGoal] = useState<GoalVersion | null>(null)
  const [range, setRange] = useState<Range>(30)
  const [detail, setDetail] = useState<DailyPoint | null>(null)
  const [showCheckin, setShowCheckin] = useState(false)

  const reload = useCallback(async () => {
    const [all, g] = await Promise.all([repos.measurement.listByType('weight'), repos.goal.getOpen()])
    setPoints(dailyMeanSeries(all))
    setGoal(g)
  }, [repos])

  useEffect(() => {
    void reload()
  }, [reload])

  const shown = useMemo(() => {
    if (range === 0) return points
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - range)
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`
    return points.filter((p) => p.date >= cutoffStr)
  }, [points, range])

  const assessment: TrendAssessment = useMemo(
    () => assessTrend(points, goal?.weeklyRateKg ?? 0),
    [points, goal],
  )

  // SVG 布局（PAD 为模块级常量，依赖仅 shown）
  const W = 440
  const H = 200
  const geom = useMemo(() => {
    const PAD = { l: 36, r: 12, t: 12, b: 22 }
    if (shown.length === 0) return null
    const values = shown.map((p) => p.mean)
    let min = Math.min(...values)
    let max = Math.max(...values)
    if (max - min < 1) {
      const mid = (max + min) / 2
      min = mid - 0.5
      max = mid + 0.5
    }
    const pad = (max - min) * 0.1
    min -= pad
    max += pad
    const x = (i: number) => PAD.l + (i / Math.max(shown.length - 1, 1)) * (W - PAD.l - PAD.r)
    const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b)
    return { x, y, min, max, PAD }
  }, [shown])

  const statusMeta = STATUS_META[assessment.status]

  return (
    <main className="page">
      <header className="page-header">
        <h1>趋势</h1>
      </header>

      <section className={`card check ${statusMeta.cls}`} aria-label="本周状态">
        <p>
          {statusMeta.icon} <b>
            {assessment.status === 'normal' ? '正常' : assessment.status === 'fast' ? '偏快' : '停滞'}
          </b>
          {assessment.actualWeeklyChange !== null && (
            <span className="card-sub"> · 本周 {assessment.actualWeeklyChange > 0 ? '+' : ''}{assessment.actualWeeklyChange.toFixed(2)} kg</span>
          )}
        </p>
        <p className="check-sub">{assessment.message}</p>
      </section>

      <section className="card" aria-label="体重曲线">
        <div className="range-row">
          <span className="card-label">体重（日均值）</span>
          <div className="range-btns">
            {([30, 90, 0] as Range[]).map((r) => (
              <button key={r} className={range === r ? 'seg seg-on seg-sm' : 'seg seg-sm'} onClick={() => setRange(r)}>
                {r === 0 ? '全部' : `${r} 天`}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 && (
          <p className="card-hint">还没有体重记录。回到今日页打卡（或补录），曲线会在这里生成。</p>
        )}

        {geom && (
          <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="体重趋势曲线">
            {/* Y 轴刻度 */}
            {[0, 0.5, 1].map((f) => {
              const v = geom.max - f * (geom.max - geom.min)
              return (
                <g key={f}>
                  <line x1={geom.PAD.l} x2={W - geom.PAD.r} y1={geom.y(v)} y2={geom.y(v)} className="chart-grid" />
                  <text x={4} y={geom.y(v) + 4} className="chart-label">{v.toFixed(1)}</text>
                </g>
              )
            })}
            {/* 均值折线 */}
            <polyline
              className="chart-line"
              points={shown.map((p, i) => `${geom.x(i)},${geom.y(p.mean)}`).join(' ')}
            />
            {/* 数据点：多条打卡带 * */}
            {shown.map((p, i) => (
              <g key={p.date} onClick={() => setDetail(p)} className="chart-dot-g">
                <circle cx={geom.x(i)} cy={geom.y(p.mean)} r={p.count > 1 ? 5 : 3.5} className={p.count > 1 ? 'chart-dot chart-dot-multi' : 'chart-dot'} />
                {p.count > 1 && (
                  <text x={geom.x(i)} y={geom.y(p.mean) - 9} className="chart-star">*</text>
                )}
              </g>
            ))}
            {/* 首尾日期标签 */}
            {shown.length > 1 && (
              <>
                <text x={geom.PAD.l} y={H - 6} className="chart-label">{shown[0].date.slice(5)}</text>
                <text x={W - geom.PAD.r} y={H - 6} textAnchor="end" className="chart-label">{shown[shown.length - 1].date.slice(5)}</text>
              </>
            )}
          </svg>
        )}
        <p className="card-hint">带 * 的点 = 当日多次打卡（点开看原始记录）；曲线用日均值口径。</p>
      </section>

      <button className="btn-primary" onClick={() => setShowCheckin(true)}>打卡 / 补录身体数据</button>

      {detail && (
        <DayDetailDialog
          repos={repos}
          point={points.find((p) => p.date === detail.date) ?? detail}
          onClose={() => setDetail(null)}
          onChanged={reload}
        />
      )}
      {showCheckin && (
        <MeasurementDialog
          repos={repos}
          date={todayStr()}
          onClose={() => setShowCheckin(false)}
          onSaved={() => {
            setShowCheckin(false)
            void reload()
          }}
        />
      )}
    </main>
  )
}
