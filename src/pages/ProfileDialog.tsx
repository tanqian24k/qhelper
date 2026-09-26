import { useState } from 'react'
import type { ActivityKey, Profile, Sex } from '@/domain/types'
import { ACTIVITY_LABELS, ACTIVITY_FACTORS } from '@/domain/types'

export interface ProfileDialogProps {
  profile: Profile
  onSave: (profile: Profile) => Promise<void>
  onClose: () => void
}

/** 档案编辑弹窗 —— spec §2.1：修改后 BMR/TDEE/预算立即重算（父组件重算） */
export function ProfileDialog({ profile, onSave, onClose }: ProfileDialogProps) {
  const [sex, setSex] = useState<Sex>(profile.sex)
  const [birthYear, setBirthYear] = useState(String(profile.birthYear))
  const [heightCm, setHeightCm] = useState(String(profile.heightCm))
  const [activityKey, setActivityKey] = useState<ActivityKey>(profile.activityKey)
  const [prefs, setPrefs] = useState(profile.prefs ?? '')
  const [saving, setSaving] = useState(false)

  const yearNum = Number(birthYear)
  const age = new Date().getFullYear() - yearNum
  const heightNum = Number(heightCm)
  const valid = (sex === 'male' || sex === 'female') && age >= 10 && age <= 100 && heightNum >= 100 && heightNum <= 250

  async function save() {
    if (!valid) return
    setSaving(true)
    try {
      await onSave({
        ...profile,
        sex,
        birthYear: yearNum,
        heightCm: heightNum,
        activityKey,
        prefs: prefs.trim() || undefined,
        updatedAt: new Date().toISOString(),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="编辑档案">
        <h2 className="dialog-title">编辑档案</h2>

        <label className="field">
          <span className="field-label">性别</span>
          <div className="seg-row">
            <button className={sex === 'male' ? 'seg seg-on' : 'seg'} onClick={() => setSex('male')}>男</button>
            <button className={sex === 'female' ? 'seg seg-on' : 'seg'} onClick={() => setSex('female')}>女</button>
          </div>
        </label>

        <label className="field">
          <span className="field-label">出生年份（{age} 岁）</span>
          <input className="input" type="number" inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">身高（cm）</span>
          <input className="input" type="number" inputMode="decimal" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">日常活动量</span>
          <div className="act-list">
            {(Object.keys(ACTIVITY_FACTORS) as ActivityKey[]).map((k) => (
              <button key={k} className={activityKey === k ? 'act act-on' : 'act'} onClick={() => setActivityKey(k)}>
                <span className="act-name">{ACTIVITY_LABELS[k]}（×{ACTIVITY_FACTORS[k]}）</span>
              </button>
            ))}
          </div>
        </label>

        <label className="field">
          <span className="field-label">饮食偏好（选填）</span>
          <textarea className="input" rows={2} value={prefs} onChange={(e) => setPrefs(e.target.value)} />
        </label>

        <div className="dialog-actions">
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" disabled={!valid || saving} onClick={save}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
