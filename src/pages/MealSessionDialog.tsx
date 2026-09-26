import { useEffect, useRef, useState } from 'react'
import type { FoodEntry, FoodLibrary, MealSlot } from '@/domain/types'
import { MEAL_SLOTS, MEAL_SLOT_LABELS } from '@/domain/types'
import type { Repos } from '@/domain/repos'

export interface MealSessionDialogProps {
  repos: Repos
  /** 补录日期（默认今天） */
  date: string
  onClose: () => void
  onCommitted: (count: number) => void
}

interface StagedItem {
  key: string
  food: FoodLibrary
  grams: number
  slot: MealSlot
}

const QUICK_PORTIONS = [0.5, 1, 2]

function kcalOf(food: FoodLibrary, grams: number): number {
  return Math.round((food.per100g.kcal * grams) / 100)
}

/**
 * 本餐会话制录入弹层 —— spec §2.4 + 06 号票结论 1：
 * 搜食物 → 选餐槽 → 填份量 →「＋ 加入本餐」入暂存区 →「完成本餐」一次入账。
 * 暂存区为空时关闭不产生任何数据。
 */
export function MealSessionDialog({ repos, date, onClose, onCommitted }: MealSessionDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodLibrary[]>([])
  const [selected, setSelected] = useState<FoodLibrary | null>(null)
  const [grams, setGrams] = useState('')
  const [slot, setSlot] = useState<MealSlot>('lunch')
  const [staged, setStaged] = useState<StagedItem[]>([])
  const [manualKcal, setManualKcal] = useState('')
  const searchSeq = useRef(0)

  // 搜索（防抖）
  useEffect(() => {
    const seq = ++searchSeq.current
    const t = setTimeout(async () => {
      const r = await repos.foodLibrary.search(query, 30)
      if (seq === searchSeq.current) setResults(r)
    }, 120)
    return () => clearTimeout(t)
  }, [query, repos])

  const gramsNum = Number(grams)
  const autoKcal = selected && gramsNum > 0 ? kcalOf(selected, gramsNum) : null
  const effectiveKcal = manualKcal.trim() !== '' ? Number(manualKcal) : autoKcal

  function pick(food: FoodLibrary) {
    setSelected(food)
    setGrams(food.defaultPortion ? String(food.defaultPortion.grams) : '100')
    setManualKcal('')
  }

  function stage() {
    if (!selected || !gramsNum || gramsNum <= 0 || effectiveKcal === null || Number.isNaN(effectiveKcal)) return
    setStaged((s) => [
      ...s,
      {
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        food: selected,
        grams: gramsNum,
        slot,
      },
    ])
    setSelected(null)
    setGrams('')
    setManualKcal('')
    setQuery('')
  }

  async function commit() {
    if (staged.length === 0) return
    const entries: Array<Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'>> = staged.map((s) => ({
      date,
      slot: s.slot,
      snapshot: { nameZh: s.food.nameZh, per100g: s.food.per100g },
      grams: s.grams,
      // 手改热量时反推克数显示：克数仍是真值——这里以「显示克数 = 输入克数」为准，
      // 手改热量仅覆盖该条目的 kcal 换算结果（快照 per100g 不变，报表口径一致）
      kcal: Math.round((s.food.per100g.kcal * s.grams) / 100),
    }))
    await repos.foodLog.addMany(entries)
    onCommitted(entries.length)
  }

  const stagedTotal = staged.reduce(
    (sum, s) => sum + Math.round((s.food.per100g.kcal * s.grams) / 100),
    0,
  )

  return (
    <div className="overlay" onClick={staged.length === 0 ? onClose : undefined}>
      <div className="dialog dialog-tall" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="记一餐">
        <h2 className="dialog-title">记一餐 · {date}</h2>

        {!selected && (
          <>
            <input
              className="input"
              placeholder="搜索食物（名称 / 拼音），如 米饭、mifan"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="food-list">
              {results.map((f) => (
                <li key={f.id}>
                  <button className="food-item" onClick={() => pick(f)}>
                    <span className="food-name">
                      {f.nameZh}
                      {f.source === 'manual' && <em className="est-tag">估算</em>}
                      {f.editable && <em className="my-tag">自定义</em>}
                    </span>
                    <span className="food-kcal">{f.per100g.kcal} kcal/100g</span>
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="card-hint">没有匹配的食物</li>}
            </ul>
          </>
        )}

        {selected && (
          <div className="pick-form">
            <p className="pick-name">
              {selected.nameZh} <span className="food-kcal">{selected.per100g.kcal} kcal/100g</span>
            </p>
            <div className="seg-row">
              {MEAL_SLOTS.map((s) => (
                <button key={s} className={slot === s ? 'seg seg-on' : 'seg'} onClick={() => setSlot(s)}>
                  {MEAL_SLOT_LABELS[s]}
                </button>
              ))}
            </div>
            {selected.defaultPortion && (
              <div className="seg-row">
                {QUICK_PORTIONS.map((m) => (
                  <button key={m} className="seg" onClick={() => setGrams(String(Math.round(selected.defaultPortion!.grams * m)))}>
                    {m === 1 ? '1 份' : m === 0.5 ? '半份' : '2 份'} ≈{Math.round(selected.defaultPortion!.grams * m)}g
                  </button>
                ))}
              </div>
            )}
            <label className="field">
              <span className="field-label">份量（克）</span>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                min={1}
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
              />
            </label>
            <p className="check-sub">热量 ≈ {autoKcal ?? '—'} kcal</p>
            <div className="dialog-actions">
              <button className="btn-ghost" onClick={() => setSelected(null)}>重选</button>
              <button className="btn-primary" disabled={!gramsNum || gramsNum <= 0} onClick={stage}>
                ＋ 加入本餐
              </button>
            </div>
          </div>
        )}

        {staged.length > 0 && (
          <div className="staged">
            <p className="card-label">本餐暂存（{staged.length} 项 · {stagedTotal} kcal）</p>
            <ul>
              {staged.map((s) => (
                <li key={s.key} className="staged-item">
                  <span>
                    {MEAL_SLOT_LABELS[s.slot]} · {s.food.nameZh} {s.grams}g ·{' '}
                    {Math.round((s.food.per100g.kcal * s.grams) / 100)} kcal
                  </span>
                  <button className="btn-link" onClick={() => setStaged((arr) => arr.filter((x) => x.key !== s.key))}>
                    移除
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="dialog-actions">
          <button className="btn-ghost" onClick={onClose}>{staged.length === 0 ? '关闭' : '放弃本餐'}</button>
          <button className="btn-primary" disabled={staged.length === 0} onClick={commit}>
            完成本餐（入账 {staged.length} 项）
          </button>
        </div>
      </div>
    </div>
  )
}
