import { useEffect, useRef, useState } from 'react'
import type { FoodLibrary, Per100g } from '@/domain/types'
import type { Repos } from '@/domain/repos'
import { useEscape } from '@/hooks/useEscape'

export interface FoodEditDialogProps {
  repos: Repos
  /** 传 null = 新增自定义食物；传条目 = 编辑 */
  initial: FoodLibrary | null
  onClose: () => void
  onSaved: () => void
}

/** 分类沿用内置库词表（spec §2.5 与内置条目同构存储） */
const CATEGORIES = ['主食', '菜肴', '蔬菜', '水果', '饮品', '豆奶', '坚果零食', '油脂调味', '鱼肉蛋豆', '其他'] as const

const EMPTY_FORM = {
  nameZh: '',
  category: '菜肴',
  kcal: '',
  proteinG: '',
  fatG: '',
  carbG: '',
  fiberG: '',
  sugarG: '',
  sodiumMg: '',
  portionLabel: '',
  portionGrams: '',
}

/**
 * 自定义食物新增/编辑弹窗 —— spec §2.5「用户可新增（名称 + 每 100g 值或按份换算）」、
 * §2.5 验收「自定义食物可与内置条目同列表检索」。
 * 营养值一律按每 100g 存（spec §2.5 最小字段集「均为每 100g 值」）。
 */
export function FoodEditDialog({ repos, initial, onClose, onSaved }: FoodEditDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEscape(onClose, !saving)

  useEffect(() => {
    if (!initial) return
    const p = initial.per100g
    setForm({
      nameZh: initial.nameZh,
      category: initial.category || '菜肴',
      kcal: String(p.kcal),
      proteinG: String(p.proteinG),
      fatG: String(p.fatG),
      carbG: String(p.carbG),
      fiberG: String(p.fiberG),
      sugarG: String(p.sugarG),
      sodiumMg: String(p.sodiumMg),
      portionLabel: initial.defaultPortion?.label ?? '',
      portionGrams: initial.defaultPortion ? String(initial.defaultPortion.grams) : '',
    })
  }, [initial])

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const kcalNum = Number(form.kcal)
  const canSave = form.nameZh.trim() !== '' && kcalNum >= 0 && Number.isFinite(kcalNum) && !saving
  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const num = (v: string) => (v.trim() === '' ? 0 : Number(v))

  async function save() {
    if (!canSave) return
    setSaving(true)
    setError('')
    const per100g: Per100g = {
      kcal: kcalNum,
      proteinG: num(form.proteinG),
      fatG: num(form.fatG),
      carbG: num(form.carbG),
      fiberG: num(form.fiberG),
      sugarG: num(form.sugarG),
      sodiumMg: num(form.sodiumMg),
    }
    // 份型选填；填了克数才算有效份型
    const grams = Number(form.portionGrams)
    const defaultPortion =
      form.portionGrams.trim() !== '' && Number.isFinite(grams) && grams > 0
        ? { label: form.portionLabel.trim() || `1 份 ≈ ${grams}g`, grams }
        : undefined

    try {
      if (initial) {
        // 内置库条目不可编辑（editable=false），自定义条目可改
        await repos.foodLibrary.update({
          ...initial,
          nameZh: form.nameZh.trim(),
          category: form.category,
          per100g,
          defaultPortion,
        })
      } else {
        await repos.foodLibrary.add({
          nameZh: form.nameZh.trim(),
          // 自定义条目加拼音检索不易实现，用户可自行补充别名；此处留空数组
          nameAlias: [],
          category: form.category,
          source: 'manual',
          per100g,
          defaultPortion,
          editable: true,
        })
      }
      onSaved()
    } catch {
      setError('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={saving ? undefined : onClose}>
      <div className="dialog dialog-tall" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={initial ? '编辑自定义食物' : '新增自定义食物'}>
        <h2 className="dialog-title">{initial ? '编辑自定义食物' : '新增自定义食物'}</h2>
        <p className="card-hint">营养值一律按「每 100g」填写；自定义条目与内置库同列表检索。</p>

        <label className="field">
          <span className="field-label">名称（必填）</span>
          <input ref={nameRef} className="input" value={form.nameZh} onChange={set('nameZh')} placeholder="如 妈妈牌番茄炒蛋" />
        </label>

        <label className="field">
          <span className="field-label">分类</span>
          <select className="input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">热量（kcal / 100g，必填）</span>
          <input className="input" type="number" inputMode="decimal" min={0} max={900} value={form.kcal} onChange={set('kcal')} placeholder="如 150" />
        </label>

        <div className="seg-row">
          <label className="field">
            <span className="field-label">蛋白质 g</span>
            <input className="input" type="number" inputMode="decimal" min={0} value={form.proteinG} onChange={set('proteinG')} />
          </label>
          <label className="field">
            <span className="field-label">脂肪 g</span>
            <input className="input" type="number" inputMode="decimal" min={0} value={form.fatG} onChange={set('fatG')} />
          </label>
          <label className="field">
            <span className="field-label">碳水 g</span>
            <input className="input" type="number" inputMode="decimal" min={0} value={form.carbG} onChange={set('carbG')} />
          </label>
        </div>
        <div className="seg-row">
          <label className="field">
            <span className="field-label">膳食纤维 g</span>
            <input className="input" type="number" inputMode="decimal" min={0} value={form.fiberG} onChange={set('fiberG')} />
          </label>
          <label className="field">
            <span className="field-label">糖 g</span>
            <input className="input" type="number" inputMode="decimal" min={0} value={form.sugarG} onChange={set('sugarG')} />
          </label>
          <label className="field">
            <span className="field-label">钠 mg</span>
            <input className="input" type="number" inputMode="decimal" min={0} value={form.sodiumMg} onChange={set('sodiumMg')} />
          </label>
        </div>

        <div className="seg-row">
          <label className="field">
            <span className="field-label">份型说明（选填）</span>
            <input className="input" value={form.portionLabel} onChange={set('portionLabel')} placeholder="如 1 碗 ≈ 250g" />
          </label>
          <label className="field">
            <span className="field-label">份型克数（选填）</span>
            <input className="input" type="number" inputMode="decimal" min={1} value={form.portionGrams} onChange={set('portionGrams')} />
          </label>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="dialog-actions">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>取消</button>
          <button className="btn-primary" disabled={!canSave} onClick={save}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}