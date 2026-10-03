import { describe, expect, it } from 'vitest'
import { ACHIEVED_TOLERANCE_KG, OVERDUE_GRACE_DAYS, assessGoalState, daysFromFinish } from './goal-state'

describe('daysFromFinish', () => {
  it('未到预计日 → 负数；已过预计日 → 正数', () => {
    expect(daysFromFinish('2026-03-01', '2026-03-10')).toBe(-9)
    expect(daysFromFinish('2026-03-10', '2026-03-01')).toBe(9)
  })

  it('空达成日 / 非法日期 → null', () => {
    expect(daysFromFinish('2026-03-01', '')).toBeNull()
    expect(daysFromFinish('2026-03-01', 'not-a-date')).toBeNull()
  })
})

describe('assessGoalState 目标状态（维持模式触发口径）', () => {
  const base = { targetWeightKg: 60, today: '2026-03-01' }

  it('进行中：未达成且未过期', () => {
    const r = assessGoalState({ ...base, currentWeightKg: 70, finishDate: '2026-05-01' })
    expect(r.state).toBe('active')
    expect(r.message).toBe('')
  })

  it('达成：日均值 ≤ 目标 + 0.5 容差', () => {
    const r = assessGoalState({ ...base, currentWeightKg: 60.5, finishDate: '2026-05-01' })
    expect(r.state).toBe('achieved')
    expect(r.message).toContain('维持模式')
  })

  it('达成边界：恰好等于目标+容差 → 达成', () => {
    const r = assessGoalState({ ...base, targetWeightKg: 60, currentWeightKg: 60 + ACHIEVED_TOLERANCE_KG, finishDate: '' })
    expect(r.state).toBe('achieved')
  })

  it('未达成：超过目标+容差 0.1kg → 仍 active', () => {
    const r = assessGoalState({ ...base, currentWeightKg: 60 + ACHIEVED_TOLERANCE_KG + 0.1, finishDate: '2026-05-01' })
    expect(r.state).toBe('active')
  })

  it('无体重记录 → 不判达成', () => {
    const r = assessGoalState({ ...base, currentWeightKg: null, finishDate: '2026-05-01' })
    expect(r.state).toBe('active')
  })

  it('过期：超过预计日 + 宽限期', () => {
    const finish = '2026-01-01'
    const r = assessGoalState({ ...base, currentWeightKg: 70, finishDate: finish, today: '2026-03-01' })
    expect(r.state).toBe('overdue')
    expect(r.message).toContain('超过预计达成日')
  })

  it('过期边界：刚好在宽限期内 → 仍 active', () => {
    // finish + OVERDUE_GRACE_DAYS 那天，d === 7，条件是 d > 7 → 不报过期
    const finish = '2026-02-22' // +7 = 2026-03-01
    const r = assessGoalState({ ...base, currentWeightKg: 70, finishDate: finish, today: '2026-03-01' })
    expect(OVERDUE_GRACE_DAYS).toBe(7)
    expect(r.state).toBe('active')
  })

  it('达成优先于过期：已达成不再报过期', () => {
    const r = assessGoalState({ ...base, currentWeightKg: 59, finishDate: '2026-01-01', today: '2026-03-01' })
    expect(r.state).toBe('achieved')
  })

  it('无预计达成日且未达成 → active', () => {
    const r = assessGoalState({ ...base, currentWeightKg: 70, finishDate: '' })
    expect(r.state).toBe('active')
  })
})