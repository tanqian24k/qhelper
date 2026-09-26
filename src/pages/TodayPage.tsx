import { useEffect, useState } from 'react'
import { MEAL_SLOTS, MEAL_SLOT_LABELS } from '@/domain/types'
import { getOrCreateRepos } from '@/repo/react'

/**
 * M0 空壳时间线页 —— spec §5 信息架构骨架：
 * 今日预算块 → 身体数据块 → 各餐块 → 本周趋势块；右下悬浮 ＋。
 * M1 起逐块填入业务；本页仅验证骨架、存储层连通与 PWA 安装。
 */
export function TodayPage() {
  const [dbOk, setDbOk] = useState<'pending' | 'ok' | 'fail'>('pending')
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    // 骨架期连通性自检：Repo 层可读写即视为存储链路 OK
    let cancelled = false
    getOrCreateRepos()
      .then(async (repos) => {
        await repos.setting.set('m0:smoke', today)
        const v = await repos.setting.get<string>('m0:smoke')
        if (!cancelled) setDbOk(v === today ? 'ok' : 'fail')
      })
      .catch(() => {
        if (!cancelled) setDbOk('fail')
      })
    return () => {
      cancelled = true
    }
  }, [today])

  return (
    <main className="page">
      <header className="page-header">
        <h1>QHelper</h1>
        <p className="page-date">{today}</p>
      </header>

      <section className="card budget-card" aria-label="今日预算">
        <p className="card-label">今日预算</p>
        <p className="budget-placeholder">— kcal</p>
        <p className="card-hint">M1 接入：完成 onboarding 与目标设定后显示</p>
      </section>

      <section className="card" aria-label="身体数据">
        <p className="card-label">身体数据</p>
        <p className="card-hint">今日还没打卡 · 不强制、可补录（M2 接入）</p>
      </section>

      {MEAL_SLOTS.map((slot) => (
        <section key={slot} className="card" aria-label={MEAL_SLOT_LABELS[slot]}>
          <p className="card-label">{MEAL_SLOT_LABELS[slot]}</p>
          <p className="card-hint">还没有记录（M1 接入本餐会话制）</p>
        </section>
      ))}

      <section className="card" aria-label="本周趋势">
        <p className="card-label">本周趋势</p>
        <p className="card-hint">三色状态与曲线（M2 接入）</p>
      </section>

      <footer className="smoke" data-db={dbOk}>
        {dbOk === 'ok' ? '✓ 本地存储就绪（IndexedDB）' : dbOk === 'fail' ? '✗ 存储自检失败' : '存储自检中…'}
      </footer>

      <button className="fab" aria-label="记一餐" title="记一餐（M1 接入）">
        ＋
      </button>
    </main>
  )
}
