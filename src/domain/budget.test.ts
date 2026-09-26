import { describe, expect, it } from 'vitest'
import { calcBmr, calcBudget, calcTdee } from './budget'
import { checkGoal, estimateFinishDate } from './goal-check'

/** spec §2.3 验收用例：女 30 岁 165cm 70kg 轻度 */
const CASE = {
  sex: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 70,
  activityKey: 'light',
} as const

describe('calcBmr (Mifflin-St Jeor)', () => {
  it('女 30 岁 165cm 70kg → ≈1420', () => {
    // 10×70 + 6.25×165 − 5×30 − 161 = 1419.25 → 1419（±1 舍入差内）
    expect(calcBmr(CASE)).toBeCloseTo(1420, 0)
  })

  it('男同身材 → +166（+5 vs −161）', () => {
    expect(calcBmr({ ...CASE, sex: 'male' })).toBe(calcBmr(CASE) + 166)
  })
})

describe('calcTdee', () => {
  it('BMR×1.375（轻度）→ ≈1953', () => {
    expect(calcTdee(calcBmr(CASE), 'light')).toBeCloseTo(1953, 0)
  })

  it('四档系数正确', () => {
    const bmr = 1000
    expect(calcTdee(bmr, 'sedentary')).toBe(1200)
    expect(calcTdee(bmr, 'moderate')).toBe(1550)
    expect(calcTdee(bmr, 'high')).toBe(1725)
  })
})

describe('calcBudget', () => {
  it('缺口 = 速率 × 1100：−0.5kg/周 → TDEE−550 ≈1403', () => {
    const tdee = calcTdee(calcBmr(CASE), 'light')
    expect(calcBudget(tdee, 0.5)).toBeCloseTo(1403, 0)
  })

  it('−1kg/周 → ≈853', () => {
    const tdee = calcTdee(calcBmr(CASE), 'light')
    expect(calcBudget(tdee, 1)).toBeCloseTo(853, 0)
  })

  it('0 速率 → 预算 = TDEE（维持模式口径）', () => {
    const tdee = calcTdee(calcBmr(CASE), 'light')
    expect(calcBudget(tdee, 0)).toBe(tdee)
  })
})

describe('checkGoal 三态校验（spec §2.2）', () => {
  it('🔴 速率 > 1kg/周 被拒', () => {
    const r = checkGoal({ ...CASE, targetWeightKg: 60, weeklyRateKg: 1.5 })
    expect(r.status).toBe('rejected')
    expect(r.reason).toContain('请降低速率')
  })

  it('🔴 预算低于硬下限（女 1200）被拒', () => {
    // −1kg/周 → 预算 ≈853 < 1200
    const r = checkGoal({ ...CASE, targetWeightKg: 60, weeklyRateKg: 1 })
    expect(r.status).toBe('rejected')
    expect(r.reason).toContain('安全下限')
  })

  it('🔴 男性硬下限为 1500', () => {
    const r = checkGoal({ ...CASE, sex: 'male', targetWeightKg: 60, weeklyRateKg: 0.8 })
    // 男 BMR≈1585, TDEE≈2180, −0.8 → 预算≈1300 < 1500 → 拒
    expect(r.status).toBe('rejected')
  })

  it('🟡 预算 < BMR 但 ≥ 下限 → 黄警可继续', () => {
    // −0.5kg/周 → 预算 ≈1403 < BMR ≈1420 且 ≥ 1200
    const r = checkGoal({ ...CASE, targetWeightKg: 65, weeklyRateKg: 0.5 })
    expect(r.status).toBe('warn')
    expect(r.warning).toContain('基础代谢')
  })

  it('🟢 温和速率通过', () => {
    // −0.25kg/周 → 预算 ≈1678 > BMR
    const r = checkGoal({ ...CASE, targetWeightKg: 65, weeklyRateKg: 0.25 })
    expect(r.status).toBe('ok')
    expect(r.budget).toBeGreaterThan(r.bmr)
  })
})

describe('estimateFinishDate', () => {
  it('剩余 5kg ÷ 0.5kg/周 = 10 周 = 70 天', () => {
    const from = new Date('2026-03-01T00:00:00Z')
    expect(estimateFinishDate(70, 65, 0.5, from)).toBe('2026-05-10')
  })

  it('已达标或速率为 0 → 空串', () => {
    expect(estimateFinishDate(65, 70, 0.5)).toBe('')
    expect(estimateFinishDate(65, 65, 0.5)).toBe('')
  })
})
