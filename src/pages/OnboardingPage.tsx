import { useState } from 'react'
import type { ActivityKey, Profile, Sex } from '@/domain/types'
import { ACTIVITY_LABELS, ACTIVITY_FACTORS } from '@/domain/types'
import { markOnboarded, getOrCreateRepos } from '@/repo/react'

const CURRENT_YEAR = new Date().getFullYear()

/** 当前体重可跳过（spec §2.1）——填了则作为测量流第一条 weight 记录 */
export interface OnboardingResult extends Profile {
  initialWeightKg?: number
}

const ACTIVITY_HINTS: Record<ActivityKey, string> = {
  sedentary: '办公室工作，很少运动',
  light: '每周运动 1–3 次',
  moderate: '每周运动 3–5 次',
  high: '体力工作或几乎每天运动',
}

/** onboarding 引导页 —— spec §2.1，四必填完成才能进入主界面 */
export function OnboardingPage() {
  const [sex, setSex] = useState<Sex | null>(null)
  const [birthYear, setBirthYear] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [activityKey, setActivityKey] = useState<ActivityKey | null>(null)
  const [weightKg, setWeightKg] = useState('')
  const [prefs, setPrefs] = useState('')
  const [saving, setSaving] = useState(false)

  const yearNum = Number(birthYear)
  const age = yearNum >= CURRENT_YEAR - 100 && yearNum <= CURRENT_YEAR ? CURRENT_YEAR - yearNum : null
  const heightNum = Number(heightCm)
  const weightNum = weightKg.trim() === '' ? null : Number(weightKg)

  const valid =
    sex !== null &&
    age !== null &&
    age >= 10 &&
    age <= 100 &&
    heightNum >= 100 &&
    heightNum <= 250 &&
    activityKey !== null &&
    (weightNum === null || (weightNum > 20 && weightNum < 300))

  async function submit() {
    if (!valid || !sex || !activityKey || age === null) return
    setSaving(true)
    const now = new Date().toISOString()
    const profile: Profile = {
      id: 'profile',
      sex,
      birthYear: yearNum,
      heightCm: heightNum,
      activityKey,
      prefs: prefs.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    }
    // 初始体重落测量流（不阻塞进入主界面）
    try {
      if (weightNum !== null) {
        const repos = await getOrCreateRepos()
        await repos.measurement.add({
          date: new Date().toISOString().slice(0, 10),
          type: 'weight',
          value: weightNum,
        })
      }
    } catch {
      // 体重记录失败不阻塞 onboarding
    }
    await markOnboarded(profile)
  }

  return (
    <main className="page onboarding">
      <h1>欢迎使用 QHelper</h1>
      <p className="onb-sub">先花一分钟填写基础信息，用于计算你的每日热量预算。所有数据只保存在本机。</p>

      <fieldset className="card">
        <legend className="card-label">性别 *</legend>
        <div className="seg-row">
          <button className={sex === 'male' ? 'seg seg-on' : 'seg'} onClick={() => setSex('male')}>男</button>
          <button className={sex === 'female' ? 'seg seg-on' : 'seg'} onClick={() => setSex('female')}>女</button>
        </div>
      </fieldset>

      <fieldset className="card">
        <legend className="card-label">出生年份 *（{age !== null ? `${age} 岁` : '用于推算年龄'}）</legend>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          placeholder={`如 ${CURRENT_YEAR - 30}`}
          value={birthYear}
          min={CURRENT_YEAR - 100}
          max={CURRENT_YEAR - 10}
          onChange={(e) => setBirthYear(e.target.value)}
        />
      </fieldset>

      <fieldset className="card">
        <legend className="card-label">身高 *（cm）</legend>
        <input
          className="input"
          type="number"
          inputMode="decimal"
          placeholder="如 165"
          value={heightCm}
          min={100}
          max={250}
          onChange={(e) => setHeightCm(e.target.value)}
        />
      </fieldset>

      <fieldset className="card">
        <legend className="card-label">日常活动量 *</legend>
        <div className="act-list">
          {(Object.keys(ACTIVITY_FACTORS) as ActivityKey[]).map((k) => (
            <button
              key={k}
              className={activityKey === k ? 'act act-on' : 'act'}
              onClick={() => setActivityKey(k)}
            >
              <span className="act-name">{ACTIVITY_LABELS[k]}（×{ACTIVITY_FACTORS[k]}）</span>
              <span className="act-hint">{ACTIVITY_HINTS[k]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="card">
        <legend className="card-label">当前体重（kg，可跳过）</legend>
        <input
          className="input"
          type="number"
          inputMode="decimal"
          placeholder="不填也可，之后随时打卡记录"
          value={weightKg}
          min={20}
          max={300}
          step={0.1}
          onChange={(e) => setWeightKg(e.target.value)}
        />
      </fieldset>

      <fieldset className="card">
        <legend className="card-label">饮食偏好（选填）</legend>
        <textarea
          className="input"
          rows={2}
          placeholder="忌口、素食等，供日后 AI 教练参考"
          value={prefs}
          onChange={(e) => setPrefs(e.target.value)}
        />
      </fieldset>

      <button className="btn-primary" disabled={!valid || saving} onClick={submit}>
        {saving ? '保存中…' : valid ? '完成，进入主页' : '请完成四项必填（*）'}
      </button>
    </main>
  )
}
