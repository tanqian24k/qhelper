import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FoodEntry, GoalVersion, Profile } from '@/domain/types'
import { MEAL_SLOTS, MEAL_SLOT_LABELS } from '@/domain/types'
import type { Repos } from '@/domain/repos'
import { ageFromBirthYear, calcBmr, calcBudget, calcTdee } from '@/domain/budget'
import { todayStr, shiftDate } from '@/utils/date'
import { GoalDialog } from './GoalDialog'
import { MealSessionDialog } from './MealSessionDialog'
import { ProfileDialog } from './ProfileDialog'
import { GoalHistoryDialog } from './GoalHistoryDialog'
import { MeasurementDialog } from './MeasurementDialog'
import { TrendPage } from './TrendPage'
import { SettingsPage } from './SettingsPage'
import { AboutPage } from './AboutPage'

export interface TodayPageProps {
  repos: Repos
  profile: Profile
}

/** 今日页（一日一页时间线）—— spec §5 信息架构，M1 接入真实数据 */
export function TodayPage({ repos, profile }: TodayPageProps) {
  const [date, setDate] = useState(todayStr)
  const [goal, setGoal] = useState<GoalVersion | null>(null)
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [showGoal, setShowGoal] = useState(false)
  const [showMeal, setShowMeal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [latestWeight, setLatestWeight] = useState<number | null>(null)
  const [todayWeight, setTodayWeight] = useState<number | null>(null)
  const [todayWeightCount, setTodayWeightCount] = useState(0)
  const [showCheckin, setShowCheckin] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [tab, setTab] = useState<'today' | 'trend' | 'settings' | 'about'>('today')
  const reloadSeq = useRef(0)
  const isToday = date === todayStr()

  const reload = useCallback(async () => {
    const seq = ++reloadSeq.current
    const [g, es] = await Promise.all([repos.goal.getOpen(), repos.foodLog.listByDate(date)])
    // 日期快速切换时丢弃过期响应
    if (seq !== reloadSeq.current) return
    setGoal(g)
    setEntries(es)
    // 当前体重 = 体重测量流最新一条（日均值口径 M2 细化）
    const weights = await repos.measurement.listByType('weight')
    if (seq !== reloadSeq.current) return
    setLatestWeight(weights.length > 0 ? weights[weights.length - 1].value : null)
    // 身体数据块：跟随当前浏览日期（非写死今天），显示该日最后一条与打卡次数
    const dayRows = await repos.measurement.listByDateAndType(date, 'weight')
    if (seq !== reloadSeq.current) return
    setTodayWeightCount(dayRows.length)
    setTodayWeight(dayRows.length > 0 ? dayRows[dayRows.length - 1].value : null)
  }, [repos, date])

  useEffect(() => {
    void reload()
  }, [reload])

  const calc = useMemo(() => {
    const bmr = calcBmr({
      sex: profile.sex,
      age: ageFromBirthYear(profile.birthYear),
      heightCm: profile.heightCm,
      // 最新体重优先；无任何体重记录时用 70kg 中位兜底但界面提示（见预算卡 hint）
      weightKg: latestWeight ?? 70,
    })
    const tdee = calcTdee(bmr, profile.activityKey)
    // 预算随目标版本固定：有目标 = TDEE − 缺口；无目标 = TDEE（维持口径）
    const budget = goal ? calcBudget(tdee, goal.weeklyRateKg) : tdee
    return { bmr, tdee, budget, weight: latestWeight ?? 70, hasWeight: latestWeight !== null }
  }, [profile, latestWeight, goal])

  const consumed = entries.reduce((s, e) => s + e.kcal, 0)
  const remain = calc.budget - consumed
  const over = remain < 0

  async function saveGoal(targetWeightKg: number, weeklyRateKg: number) {
    await repos.goal.openNew({ targetWeightKg, weeklyRateKg })
    setShowGoal(false)
    await reload()
  }

  async function saveProfile(p: Profile) {
    await repos.profile.save(p)
    setShowProfile(false)
    window.location.reload()
  }

  return (
    <>
      {tab === 'trend' && <TrendPage repos={repos} />}
      {tab === 'settings' && <SettingsPage />}
      {tab === 'about' && <AboutPage />}
      {tab === 'today' && (
        <main className="page">
          <header className="page-header">
            <h1>QHelper</h1>
            <button className="btn-link" onClick={() => setShowProfile(true)}>档案</button>
          </header>

          <div className="date-nav">
            <button className="seg" onClick={() => setDate((d) => shiftDate(d, -1))}>‹ 前一天</button>
            <span className="date-label">{date}{isToday ? '（今天）' : ''}</span>
            <button className="seg" disabled={isToday} onClick={() => setDate((d) => shiftDate(d, 1))}>后一天 ›</button>
          </div>

      <section className="card budget-card" aria-label="今日预算">
        <p className="card-label">{isToday ? '今日预算' : '当日预算'}</p>
        {over ? (
          <p className="budget-over">超出 {Math.abs(remain).toLocaleString()} kcal</p>
        ) : (
          <p className="budget-placeholder">{remain.toLocaleString()} <small>kcal</small></p>
        )}
        <p className="card-hint">
          预算 {calc.budget.toLocaleString()} · 已摄入 {consumed.toLocaleString()} kcal
          {!calc.hasWeight && ' · ⚠ 未记录体重，暂按 70kg 估算，建议打卡体重'}
        </p>
      </section>

      <section className="card" aria-label="目标">
        {goal ? (
          <>
            <p className="card-label">
              目标：{calc.weight} → {goal.targetWeightKg} kg · −{goal.weeklyRateKg} kg/周
            </p>
            <p className="card-hint">缺口 {calc.tdee - calc.budget} kcal/日（预算随目标固定，不随运动调整）</p>
            <button className="btn-link" onClick={() => setShowGoal(true)}>修改目标</button>
            <button className="btn-link" onClick={() => setShowHistory(true)}>历史版本</button>
          </>
        ) : (
          <>
            <p className="card-label">还没有设定目标</p>
            <p className="card-hint">设定目标体重与每周速率，算出你的每日预算。</p>
            <button className="btn-primary btn-block" onClick={() => setShowGoal(true)}>设定目标</button>
          </>
        )}
      </section>

      <section className="card" aria-label="身体数据">
        {todayWeight !== null ? (
          <>
            <p className="card-label">
              身体数据 · {isToday ? '今日' : '当日'}已打卡{todayWeightCount > 1 ? `（${todayWeightCount} 次）` : ''}
            </p>
            <p className="card-value">{todayWeight} <small>kg</small></p>
            {todayWeightCount > 1 && <p className="card-hint">曲线取日均值口径，带 * 标记</p>}
            <button className="btn-link" onClick={() => setShowCheckin(true)}>
              {isToday ? '再记一次 / 修改' : '补记一条 / 修改'}
            </button>
          </>
        ) : (
          <>
            <p className="card-label">身体数据</p>
            <p className="card-hint">
              {isToday
                ? latestWeight !== null
                  ? `最新体重 ${latestWeight} kg · 今日还没打卡`
                  : '今日还没打卡'
                : `${date} 当日未打卡（最新体重 ${latestWeight ?? '—'} kg）`}
              {' '}· 不强制、可补录
            </p>
            <button className="btn-primary btn-block" onClick={() => setShowCheckin(true)}>
              {isToday ? '打卡体重' : `为 ${date.slice(5)} 补打卡`}
            </button>
          </>
        )}
      </section>

      {MEAL_SLOTS.map((slot) => {
        const items = entries.filter((e) => e.slot === slot)
        const subtotal = items.reduce((s, e) => s + e.kcal, 0)
        return (
          <section key={slot} className="card" aria-label={MEAL_SLOT_LABELS[slot]}>
            <p className="card-label">
              {MEAL_SLOT_LABELS[slot]}
              {items.length > 0 && <span className="card-sub"> · {subtotal} kcal</span>}
            </p>
            {items.length === 0 ? (
              <p className="card-hint">还没有记录</p>
            ) : (
              <ul className="entry-list">
                {items.map((e) => (
                  <li key={e.id} className="entry-item">
                    <span>
                      {e.snapshot.nameZh} {e.grams}g
                    </span>
                    <span className="entry-kcal">
                      {e.kcal} kcal
                      <button
                        className="btn-link"
                        aria-label={`删除${e.snapshot.nameZh}`}
                        onClick={async () => {
                          await repos.foodLog.remove(e.id)
                          await reload()
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      <button className="fab" aria-label="记一餐" onClick={() => setShowMeal(true)}>＋</button>

      {showGoal && (
        <GoalDialog
          profile={profile}
          currentWeightKg={calc.weight}
          openGoal={goal}
          onSave={saveGoal}
          onClose={() => setShowGoal(false)}
        />
      )}
      {showMeal && (
        <MealSessionDialog
          repos={repos}
          date={date}
          onClose={() => setShowMeal(false)}
          onCommitted={async () => {
            setShowMeal(false)
            await reload()
          }}
        />
      )}
      {showProfile && <ProfileDialog profile={profile} onSave={saveProfile} onClose={() => setShowProfile(false)} />}
      {showHistory && <GoalHistoryDialog repos={repos} onClose={() => setShowHistory(false)} />}
      {showCheckin && (
        <MeasurementDialog
          repos={repos}
          date={date}
          onClose={() => setShowCheckin(false)}
          onSaved={() => {
            setShowCheckin(false)
            void reload()
          }}
        />
      )}
        </main>
      )}
      {/* 原生 App 风格底部导航（fixed，全页面共用） */}
      <nav className="tab-bar" aria-label="页面切换">
        <button className={tab === 'today' ? 'tabbar-item tabbar-on' : 'tabbar-item'} onClick={() => setTab('today')}>
          <span className="tabbar-icon">🍽️</span>
          <span className="tabbar-label">今日</span>
        </button>
        <button className={tab === 'trend' ? 'tabbar-item tabbar-on' : 'tabbar-item'} onClick={() => setTab('trend')}>
          <span className="tabbar-icon">📈</span>
          <span className="tabbar-label">趋势</span>
        </button>
        <button className={tab === 'settings' ? 'tabbar-item tabbar-on' : 'tabbar-item'} onClick={() => setTab('settings')}>
          <span className="tabbar-icon">⚙️</span>
          <span className="tabbar-label">设置</span>
        </button>
        <button className={tab === 'about' ? 'tabbar-item tabbar-on' : 'tabbar-item'} onClick={() => setTab('about')}>
          <span className="tabbar-icon">ℹ️</span>
          <span className="tabbar-label">关于</span>
        </button>
      </nav>
    </>
  )
}
