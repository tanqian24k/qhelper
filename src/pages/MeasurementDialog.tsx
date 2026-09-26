import { useState } from 'react'
import type { MeasurementType } from '@/domain/types'
import type { Repos } from '@/domain/repos'
import { useEscape } from '@/hooks/useEscape'
import { todayStr } from '@/utils/date'

export interface MeasurementDialogProps {
  repos: Repos
  /** 打卡日期（默认今天，可改 = 补录） */
  date: string
  onClose: () => void
  onSaved: () => void
}

const TYPES: Array<{ key: MeasurementType; label: string; unit: string; step: number; placeholder: string }> = [
  { key: 'weight', label: '体重', unit: 'kg', step: 0.1, placeholder: '如 69.5' },
  { key: 'bodyfat', label: '体脂率', unit: '%', step: 0.1, placeholder: '选填，如 22.0' },
  { key: 'waist', label: '腰围', unit: 'cm', step: 0.5, placeholder: '选填，如 82' },
  { key: 'hip', label: '臀围', unit: 'cm', step: 0.5, placeholder: '选填，如 95' },
]

/**
 * 打卡弹窗 —— spec §2.6：同日同类型多条不拦截（早晚各一次都保留）；
 * 任意过去日期可打卡（补录）；体脂/围度选填。
 */
export function MeasurementDialog({ repos, date: initialDate, onClose, onSaved }: MeasurementDialogProps) {
  const [date, setDate] = useState(initialDate)
  const [values, setValues] = useState<Record<MeasurementType, string>>({ weight: '', bodyfat: '', waist: '', hip: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEscape(onClose, !saving)

  const weightNum = Number(values.weight)
  const canSave = values.weight.trim() !== '' && weightNum > 20 && weightNum < 300 && !saving

  async function save() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      // 校验选填值
      const extras = TYPES.slice(1).filter((t) => values[t.key].trim() !== '')
      for (const t of extras) {
        const n = Number(values[t.key])
        if (Number.isNaN(n) || n <= 0 || n > 500) {
          setError(`${t.label}数值不合法`)
          setSaving(false)
          return
        }
      }
      const adds: Array<Parameters<typeof repos.measurement.add>[0]> = [
        { date, type: 'weight', value: weightNum },
      ]
      for (const t of extras) {
        adds.push({ date, type: t.key, value: Number(values[t.key]) })
      }
      for (const a of adds) {
        await repos.measurement.add(a)
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
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="打卡身体数据">
        <h2 className="dialog-title">打卡身体数据</h2>
        <p className="card-hint">同一天可多次打卡（早晚各一次都保留），曲线取日均值。</p>

        <label className="field">
          <span className="field-label">日期（可改过去日期 = 补录）</span>
          <input className="input" type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
        </label>

        {TYPES.map((t) => (
          <label className="field" key={t.key}>
            <span className="field-label">
              {t.label}（{t.unit}）
              {t.key !== 'weight' && ' · 选填'}
            </span>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              step={t.step}
              min={t.key === 'weight' ? 20 : 0}
              max={t.key === 'weight' ? 300 : 500}
              placeholder={t.placeholder}
              value={values[t.key]}
              onChange={(e) => setValues((v) => ({ ...v, [t.key]: e.target.value }))}
            />
          </label>
        ))}

        {error && <p className="form-error">{error}</p>}

        <div className="dialog-actions">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>取消</button>
          <button className="btn-primary" disabled={!canSave} onClick={save}>
            {saving ? '保存中…' : '保存打卡'}
          </button>
        </div>
      </div>
    </div>
  )
}
