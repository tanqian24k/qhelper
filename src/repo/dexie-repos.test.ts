import { describe, expect, it, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { dexieRepos, clearAll } from './dexie-repos'
import { seedFoodLibrary, BUILTIN_LIBRARY } from './seed'

const repos = dexieRepos

describe('Dexie Repo 集成（fake-indexeddb）', () => {
  beforeEach(async () => {
    await clearAll()
  })

  it('档案单例：保存后可读回', async () => {
    const now = new Date().toISOString()
    await repos.profile.save({
      id: 'profile',
      sex: 'female',
      birthYear: 1996,
      heightCm: 165,
      activityKey: 'light',
      createdAt: now,
      updatedAt: now,
    })
    const p = await repos.profile.get()
    expect(p?.sex).toBe('female')
    expect(p?.heightCm).toBe(165)
  })

  it('目标版本：openNew 封存旧版本，仅一个开放版本', async () => {
    const g1 = await repos.goal.openNew({ targetWeightKg: 65, weeklyRateKg: 0.5 })
    expect(g1.closedOn).toBeUndefined()
    const g2 = await repos.goal.openNew({ targetWeightKg: 62, weeklyRateKg: 0.25 })
    const all = await repos.goal.listAll()
    expect(all.length).toBe(2)
    const open = await repos.goal.getOpen()
    expect(open?.id).toBe(g2.id)
    expect(open?.targetWeightKg).toBe(62)
    // g1 已封存
    const g1After = all.find((g) => g.id === g1.id)
    expect(g1After?.closedOn).toBeTruthy()
  })

  it('本餐会话：addMany 一次入账多条，按日期查询', async () => {
    await repos.foodLog.addMany([
      { date: '2026-03-01', slot: 'lunch', snapshot: { nameZh: '米饭', per100g: BUILTIN_LIBRARY[0].per100g }, grams: 200, kcal: 232 },
      { date: '2026-03-01', slot: 'lunch', snapshot: { nameZh: '番茄炒蛋', per100g: BUILTIN_LIBRARY[0].per100g }, grams: 250, kcal: 220 },
      { date: '2026-03-01', slot: 'dinner', snapshot: { nameZh: '苹果', per100g: BUILTIN_LIBRARY[0].per100g }, grams: 200, kcal: 106 },
    ])
    const day = await repos.foodLog.listByDate('2026-03-01')
    expect(day.length).toBe(3)
    const lunch = await repos.foodLog.listBySlot('2026-03-01', 'lunch')
    expect(lunch.length).toBe(2)
    const dinner = await repos.foodLog.listBySlot('2026-03-01', 'dinner')
    expect(dinner.length).toBe(1)
  })

  it('快照复制：改食物库后，历史条目数值不变（spec §2.4 验收）', async () => {
    const food = await repos.foodLibrary.add({
      nameZh: '测试食物',
      nameAlias: ['ceshi'],
      category: '主食',
      source: 'manual',
      per100g: { kcal: 100, proteinG: 5, fatG: 5, carbG: 5, fiberG: 0, sugarG: 0, sodiumMg: 0 },
      editable: true,
    })
    await repos.foodLog.addMany([
      { date: '2026-03-01', slot: 'lunch', snapshot: { nameZh: food.nameZh, per100g: food.per100g }, grams: 100, kcal: 100 },
    ])
    // 改库：热量翻倍
    await repos.foodLibrary.update({ ...food, per100g: { ...food.per100g, kcal: 200 } })
    // 历史条目仍是快照值
    const entry = (await repos.foodLog.listByDate('2026-03-01'))[0]
    expect(entry.snapshot.per100g.kcal).toBe(100)
    expect(entry.kcal).toBe(100)
    // 库已更新
    const updated = await repos.foodLibrary.get(food.id)
    expect(updated?.per100g.kcal).toBe(200)
  })

  it('测量：同日同类型多条合法，日均值正确（spec §2.6 验收口径）', async () => {
    await repos.measurement.add({ date: '2026-03-01', type: 'weight', value: 70.0 })
    await repos.measurement.add({ date: '2026-03-01', type: 'weight', value: 69.3 })
    const list = await repos.measurement.listByDateAndType('2026-03-01', 'weight')
    expect(list.length).toBe(2)
    const mean = await repos.measurement.dailyMean('weight', '2026-03-01')
    expect(mean).toBeCloseTo(69.65, 2)
  })

  it('测量：删除误录后日均值即时更新', async () => {
    const m1 = await repos.measurement.add({ date: '2026-03-01', type: 'weight', value: 70.0 })
    await repos.measurement.add({ date: '2026-03-01', type: 'weight', value: 69.3 })
    await repos.measurement.remove(m1.id)
    const mean = await repos.measurement.dailyMean('weight', '2026-03-01')
    expect(mean).toBeCloseTo(69.3, 2)
  })

  it('内置食物库种子：幂等，二次导入不重复', async () => {
    const n1 = await seedFoodLibrary(repos)
    expect(n1).toBe(BUILTIN_LIBRARY.length)
    expect(n1).toBeGreaterThanOrEqual(300)
    const n2 = await seedFoodLibrary(repos)
    expect(n2).toBe(0)
    expect(await repos.foodLibrary.count()).toBe(BUILTIN_LIBRARY.length)
  })

  it('搜索：中文名与拼音均可命中', async () => {
    await seedFoodLibrary(repos)
    const byZh = await repos.foodLibrary.search('米饭')
    expect(byZh.some((f) => f.nameZh === '米饭')).toBe(true)
    const byPy = await repos.foodLibrary.search('mifan')
    expect(byZh.some((f) => f.nameZh === '米饭')).toBe(true)
    expect(byPy.length).toBeGreaterThan(0)
  })

  it('设置读写', async () => {
    await repos.setting.set('k', 'v1')
    expect(await repos.setting.get<string>('k')).toBe('v1')
    await repos.setting.set('k', 'v2')
    expect(await repos.setting.get<string>('k')).toBe('v2')
  })
})
