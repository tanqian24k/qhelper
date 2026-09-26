import { useEffect, useMemo, useState } from 'react'
import type { GoalVersion, Profile } from '@/domain/types'
import type { GoalCheckResult } from '@/domain/goal-check'
import { checkGoal, estimateFinishDate } from '@/domain/goal-check'
import { ageFromBirthYear } from '@/domain/budget'

export interface GoalDialogProps {
  profile: Profile
  /** 当前体重（测量流最新日均值，或 onboarding 手填值） */
  currentWeightKg: number
  openGoal: GoalVersion | null
  onSave: (targetWeightKg: number, weeklyRateKg: number) => Promise<void>
  onClose: () => void
}

const RATE_PRESETS = [0.25, 0.5, 0.75, 1]

/** 目标编辑统一弹窗 —— spec §2.2 + 06 号票结论 4：红拦/黄警/绿过实时预览 */
export function GoalDialog({ profile, currentWeightKg, openGoal, onSave, onClose }: GoalDialogProps) {
  const [targetWeight, setTargetWeight] = useState(
    openGoal ? String(openGoal.targetWeightKg) : (currentWeightKg - 5).toFixed(1),
  )
  const [rate, setRate] = useState(openGoal ? String(openGoal.weeklyRateKg) : '0.5')
  const [ackWarn, setAckWarn] = useState(false)
  const [preview, setPreview] = useState<GoalCheckResult | null>(null)
  const [saving, setSaving] = useState(false)

  const targetNum = Number(targetWeight)
  const rateNum = Number(rate)
  const inputValid = targetNum > 20 && targetNum < 300 && rateNum >= 0 && rateNum <= 3

  // 实时预览：输入变化即校验（防抖 150ms）
  useEffect(() => {
    if (!inputValid) {
      setPreview(null)
      return
    }
    const t = setTimeout(() => {
      setPreview(
        checkGoal({
          sex: profile.sex,
          age: ageFromBirthYear(profile.birthYear),
          heightCm: profile.heightCm,
          weightKg: currentWeightKg,
          activityKey: profile.activityKey,
          targetWeightKg: targetNum,
          weeklyRateKg: rateNum,
        }),
      )
    }, 150)
    return () => clearTimeout(t)
  }, [inputValid, profile, currentWeightKg, targetNum, rateNum])

  const status = preview?.status ?? null
  const finishDate = useMemo(
    () =>
      inputValid && rateNum > 0 && targetNum < currentWeightKg
        ? estimateFinishDate(currentWeightKg, targetNum, rateNum)
        : '',
    [inputValid, currentWeightKg, targetNum, rateNum],
  )

  const canSave =
    inputValid && preview !== null && (status === 'ok' || (status === 'warn' && ackWarn)) && !saving

  async function save() {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave(targetNum, rateNum)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="目标设定">
        <h2 className="dialog-title">{openGoal ? '修改目标' : '设定目标'}</h2>

        <label className="field">
          <span className="field-label">目标体重（kg）</span>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step={0.1}
            min={20}
            max={300}
            value={targetWeight}
            onChange={(e) => {
              setTargetWeight(e.target.value)
              setAckWarn(false)
            }}
          />
        </label>

        <label className="field">
          <span className="field-label">每周减重速率（kg/周）</span>
          <div className="seg-row">
            {RATE_PRESETS.map((r) => (
              <button
                key={r}
                className={rateNum === r ? 'seg seg-on' : 'seg'}
                onClick={() => {
                  setRate(String(r))
                  setAckWarn(false)
                }}
              >
                −{r}
              </button>
            ))}
          </div>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step={0.05}
            min={0}
            max={3}
            value={rate}
            onChange={(e) => {
              setRate(e.target.value)
              setAckWarn(false)
            }}
          />
        </label>

        {preview && (
          <div className={`check check-${status}`}>
            {status === 'rejected' && <p>🔴 {preview.reason}</p>}
            {status === 'warn' && (
              <>
                <p>🟡 {preview.warning}</p>
                <label className="ack">
                  <input
                    type="checkbox"
                    checked={ackWarn}
                    onChange={(e) => setAckWarn(e.target.checked)}
                  />
                  我已了解黄警风险
                </label>
              </>
            )}
            {status === 'ok' && (
              <p>
                🟢 每日预算 <b>{preview.budget}</b> kcal
                {finishDate && <>，预计 {finishDate} 达成</>}
              </p>
            )}
            {status !== 'rejected' && rateNum > 0 && (
              <p className="check-sub">
                BMR {preview.bmr} · TDEE {preview.tdee} · 缺口 {(preview.tdee - preview.budget).toLocaleString()} kcal/日
                {status === 'warn' && finishDate && <> · 预计 {finishDate} 达成</>}
              </p>
            )}
          </div>
        )}

        <div className="dialog-actions">
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" disabled={!canSave} onClick={save}>
            {saving ? '保存中…' : '保存目标'}
          </button>
        </div>
      </div>
    </div>
  )
}
