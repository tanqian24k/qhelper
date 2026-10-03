import { useEffect, useRef, useState } from 'react'
import type { FoodEntry, FoodLibrary, MealSlot } from '@/domain/types'
import { MEAL_SLOTS, MEAL_SLOT_LABELS } from '@/domain/types'
import { kcalOfFood, gramsFromKcal } from '@/domain/food'
import type { Repos } from '@/domain/repos'
import { useEscape } from '@/hooks/useEscape'
import { FoodEditDialog } from './FoodEditDialog'

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
  /** 手改后的热量；未手改时为 null（按 per100g×g 换算） */
  manualKcal: number | null
  slot: MealSlot
}

const QUICK_PORTIONS = [0.5, 1, 2]

function effectiveKcalOf(item: StagedItem): number {
  return item.manualKcal ?? kcalOfFood(item.food.per100g, item.grams)
}

/** 按当前时间给出默认餐槽 */
function defaultSlot(): MealSlot {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 14) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}

/**
 * 本餐会话制录入弹层 —— spec §2.4 + 06 号票结论 1：
 * 搜食物 → 选餐槽 → 填份量 →「＋ 加入本餐」入暂存区 →「完成本餐」一次入账。
 * 暂存区为空时关闭不产生任何数据；热量可手改（反推克数）。
 */
export function MealSessionDialog({ repos, date, onClose, onCommitted }: MealSessionDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodLibrary[]>([])
  const [selected, setSelected] = useState<FoodLibrary | null>(null)
  const [grams, setGrams] = useState('')
  const [kcalInput, setKcalInput] = useState('')
  const [slot, setSlot] = useState<MealSlot>(defaultSlot)
  const [staged, setStaged] = useState<StagedItem[]>([])
  const [committing, setCommitting] = useState(false)
  const [editingFood, setEditingFood] = useState<FoodLibrary | 'new' | null>(null)
  const searchSeq = useRef(0)

  useEscape(onClose, staged.length === 0 && !committing)

  // 搜索（防抖 + 序号守卫）
  useEffect(() => {
    const seq = ++searchSeq.current
    const t = setTimeout(async () => {
      const r = await repos.foodLibrary.search(query, 30)
      if (seq === searchSeq.current) setResults(r)
    }, 120)
    return () => clearTimeout(t)
  }, [query, repos])

  // 自定义食物保存后刷新搜索结果，让新条目立刻可被检索（spec §2.5 验收）
  useEffect(() => {
    if (editingFood === null) return
    let cancelled = false
    void (async () => {
      const r = await repos.foodLibrary.search(query, 30)
      if (!cancelled) setResults(r)
    })()
    return () => {
      cancelled = true
    }
  }, [editingFood, query, repos])

  const gramsNum = Number(grams)
  const kcalNum = Number(kcalInput)
  const kcalValid = kcalInput.trim() === '' || (kcalNum > 0 && kcalNum < 5000)
  const canStage = selected !== null && gramsNum > 0 && kcalValid

  function pick(food: FoodLibrary) {
    setSelected(food)
    setGrams(food.defaultPortion ? String(food.defaultPortion.grams) : '100')
    setKcalInput('')
  }

  function stage() {
    if (!selected || !canStage) return
    setStaged((s) => [
      ...s,
      {
        key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        food: selected,
        grams: gramsNum,
        manualKcal: kcalInput.trim() === '' ? null : Math.round(kcalNum),
        slot,
      },
    ])
    setSelected(null)
    setGrams('')
    setKcalInput('')
    setQuery('')
  }

  async function commit() {
    if (staged.length === 0 || committing) return
    setCommitting(true)
    try {
      const entries: Array<Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'>> = staged.map((s) => ({
        date,
        slot: s.slot,
        // 快照复制（spec §2.4）：录入时拷贝名称与 per100g，改库不改历史
        snapshot: { nameZh: s.food.nameZh, per100g: s.food.per100g },
        grams: s.grams,
        kcal: effectiveKcalOf(s),
      }))
      await repos.foodLog.addMany(entries)
      onCommitted(entries.length)
    } finally {
      setCommitting(false)
    }
  }

  const stagedTotal = staged.reduce((sum, s) => sum + effectiveKcalOf(s), 0)

  return (
    <div className="overlay" onClick={staged.length === 0 && !committing ? onClose : undefined}>
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
                  {f.editable && (
                    <button className="btn-link" aria-label={`编辑${f.nameZh}`} onClick={() => setEditingFood(f)}>
                      编辑
                    </button>
                  )}
                </li>
              ))}
              {results.length === 0 && <li className="card-hint">没有匹配的食物</li>}
            </ul>
            <button className="btn-ghost btn-block" onClick={() => setEditingFood('new')}>
              ＋ 新增自定义食物
            </button>
          </>
        )}

        {selected && (
          <div className="pick-form">
            <p className="pick-name">
              {selected.nameZh} <span className="food-kcal">{selected.per100g.kcal} kcal/100g</span>
            </p>
            {selected.source === 'manual' && (
              <p className="card-hint">
                ⚠ 估算值：{selected.estimateNote ?? '内置库按常见做法估算'}，与实际做法可能有偏差
              </p>
            )}
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
              <span className="field-label">份量（克，存储真值）</span>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                min={1}
                value={grams}
                onChange={(e) => {
                  setGrams(e.target.value)
                  setKcalInput('')
                }}
              />
            </label>
            <p className="check-sub">热量 ≈ {gramsNum > 0 ? kcalOfFood(selected.per100g, gramsNum) : '—'} kcal</p>
            <label className="field">
              <span className="field-label">手改热量（kcal，选填；改后按比例反推份量显示）</span>
              <input
                className="input"
                type="number"
                inputMode="decimal"
                min={1}
                placeholder="不填按每 100g 值换算"
                value={kcalInput}
                onChange={(e) => {
                  const v = e.target.value
                  setKcalInput(v)
                  const n = Number(v)
                  if (v.trim() !== '' && n > 0 && selected.per100g.kcal > 0) {
                    // 改热量 → 反推克数显示（克数仍是真值口径的展示换算）
                    setGrams(String(gramsFromKcal(selected.per100g, n)))
                  }
                }}
              />
            </label>
            <div className="dialog-actions">
              <button className="btn-ghost" onClick={() => setSelected(null)}>重选</button>
              <button className="btn-primary" disabled={!canStage} onClick={stage}>
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
                    {MEAL_SLOT_LABELS[s.slot]} · {s.food.nameZh} {s.grams}g · {effectiveKcalOf(s)} kcal
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
          <button className="btn-ghost" onClick={onClose} disabled={committing}>
            {staged.length === 0 ? '关闭' : '放弃本餐'}
          </button>
          <button className="btn-primary" disabled={staged.length === 0 || committing} onClick={commit}>
            {committing ? '入账中…' : `完成本餐（入账 ${staged.length} 项）`}
          </button>
        </div>

        {editingFood && (
          <FoodEditDialog
            repos={repos}
            initial={editingFood === 'new' ? null : editingFood}
            onClose={() => setEditingFood(null)}
            onSaved={() => setEditingFood(null)}
          />
        )}
      </div>
    </div>
  )
}
