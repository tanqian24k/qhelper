import { useState } from 'react'
import type { FoodEntry, MealSlot } from '@/domain/types'
import { MEAL_SLOTS, MEAL_SLOT_LABELS } from '@/domain/types'
import type { Repos } from '@/domain/repos'
import { kcalOfFood, gramsFromKcal } from '@/domain/food'
import { useEscape } from '@/hooks/useEscape'

export interface EntryEditDialogProps {
  repos: Repos
  /** 被编辑的条目（含快照，改动不回落食物库） */
  entry: FoodEntry
  onClose: () => void
  onSaved: () => void
}

/**
 * 已记条目编辑弹窗 —— spec §2.4「任意过去日期可补/改/删，无限制」的「改」部分。
 * 只改本条（餐槽 / 克数 / 热量）；历史快照 nameZh 与 per100g 不可变，
 * 因此改这里不会影响食物库，也不会改写当初录入时的营养快照。
 */
export function EntryEditDialog({ repos, entry, onClose, onSaved }: EntryEditDialogProps) {
  const [slot, setSlot] = useState<MealSlot>(entry.slot)
  const [grams, setGrams] = useState(String(entry.grams))
  const [kcalInput, setKcalInput] = useState(String(entry.kcal))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEscape(onClose, !saving)

  const gramsNum = Number(grams)
  const kcalNum = Number(kcalInput)
  const kcalValid = kcalInput.trim() === '' || (kcalNum > 0 && kcalNum < 5000)
  const canSave = gramsNum > 0 && kcalValid && !saving

  async function save() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      await repos.foodLog.update({
        ...entry,
        slot,
        grams: gramsNum,
        kcal: kcalInput.trim() === '' ? kcalOfFood(entry.snapshot.per100g, gramsNum) : Math.round(kcalNum),
        updatedAt: new Date().toISOString(),
      })
      onSaved()
    } catch {
      setError('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={saving ? undefined : onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="编辑条目">
        <h2 className="dialog-title">编辑 · {entry.snapshot.nameZh}</h2>
        <p className="card-hint">
          {entry.date} · 修改只影响这一条，不会改动食物库或历史营养快照。
        </p>

        <div className="seg-row">
          {MEAL_SLOTS.map((s) => (
            <button key={s} className={slot === s ? 'seg seg-on' : 'seg'} onClick={() => setSlot(s)}>
              {MEAL_SLOT_LABELS[s]}
            </button>
          ))}
        </div>

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
              // 克数变了，热量若未手改则按快照重算，保持两栏一致
              const g = Number(e.target.value)
              if (g > 0) setKcalInput(String(kcalOfFood(entry.snapshot.per100g, g)))
            }}
          />
        </label>

        <label className="field">
          <span className="field-label">热量（kcal）</span>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            min={1}
            max={5000}
            value={kcalInput}
            onChange={(e) => {
              const v = e.target.value
              setKcalInput(v)
              const n = Number(v)
              if (v.trim() !== '' && n > 0 && entry.snapshot.per100g.kcal > 0) {
                setGrams(String(gramsFromKcal(entry.snapshot.per100g, n)))
              }
            }}
          />
        </label>
        {!kcalValid && <p className="form-error">热量需在 1–5000 kcal 之间</p>}
        {error && <p className="form-error">{error}</p>}

        <div className="dialog-actions">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>取消</button>
          <button className="btn-primary" disabled={!canSave} onClick={save}>
            {saving ? '保存中…' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  )
}