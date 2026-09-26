import { describe, expect, it, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { dexieRepos as repos, clearAll, db } from './dexie-repos'
import { exportAll, parseImport, importAll, EXPORT_SCHEMA_VERSION } from './backup'
import { seedFoodLibrary } from './seed'

describe('导出/导入（spec §2.7 验收口径）', () => {
  beforeEach(async () => {
    await clearAll()
  })

  it('导出包含六段数据且 schemaVersion 正确', async () => {
    const now = new Date().toISOString()
    await repos.profile.save({ id: 'profile', sex: 'female', birthYear: 1996, heightCm: 165, activityKey: 'light', createdAt: now, updatedAt: now })
    await repos.goal.openNew({ targetWeightKg: 65, weeklyRateKg: 0.5 })
    await repos.measurement.add({ date: '2026-03-01', type: 'weight', value: 70 })
    await repos.foodLog.addMany([{ date: '2026-03-01', slot: 'lunch', snapshot: { nameZh: '米饭', per100g: { kcal: 116, proteinG: 2.6, fatG: 0.3, carbG: 25.9, fiberG: 0.6, sugarG: 0.1, sodiumMg: 2 } }, grams: 200, kcal: 232 }])
    await repos.setting.set('k', 'v')
    const bundle = await exportAll()
    expect(bundle.schemaVersion).toBe(EXPORT_SCHEMA_VERSION)
    expect(bundle.profile?.sex).toBe('female')
    expect(bundle.goalVersions.length).toBe(1)
    expect(bundle.measurements.length).toBe(1)
    expect(bundle.foodEntries.length).toBe(1)
    expect(bundle.settings.length).toBe(1)
  })

  it('清库 → 导入无损（spec §2.7：清空后导入数据无损）', async () => {
    await seedFoodLibrary(repos)
    const now = new Date().toISOString()
    await repos.profile.save({ id: 'profile', sex: 'male', birthYear: 1990, heightCm: 175, activityKey: 'moderate', createdAt: now, updatedAt: now })
    await repos.goal.openNew({ targetWeightKg: 70, weeklyRateKg: 0.25 })
    await repos.measurement.add({ date: '2026-03-01', type: 'weight', value: 75.5 })
    await repos.foodLibrary.add({ nameZh: '自定义菜', nameAlias: ['zidingyi'], category: '菜肴', source: 'manual', per100g: { kcal: 150, proteinG: 8, fatG: 9, carbG: 5, fiberG: 1, sugarG: 1, sodiumMg: 400 }, editable: true })
    await repos.foodLog.addMany([{ date: '2026-03-02', slot: 'dinner', snapshot: { nameZh: '自定义菜', per100g: { kcal: 150, proteinG: 8, fatG: 9, carbG: 5, fiberG: 1, sugarG: 1, sodiumMg: 400 } }, grams: 300, kcal: 450 }])

    const bundle = await exportAll()
    const text = JSON.stringify(bundle)

    // 模拟「清空站点数据」：全表清空
    await clearAll()
    expect((await db.measurement.toArray()).length).toBe(0)

    // 导入还原
    const preview = await importAll(text)
    expect(preview.counts.measurements).toBe(1)
    expect(preview.counts.foodEntries).toBe(1)

    // 逐段校验无损
    const profile = await repos.profile.get()
    expect(profile?.sex).toBe('male')
    const goal = await repos.goal.getOpen()
    expect(goal?.weeklyRateKg).toBe(0.25)
    const ms = await repos.measurement.listByType('weight')
    expect(ms[0].value).toBe(75.5)
    const entries = await repos.foodLog.listByDate('2026-03-02')
    expect(entries[0].snapshot.nameZh).toBe('自定义菜')
    expect(entries[0].kcal).toBe(450)
    // 内置库也随备份还原（seed 数据在导出里）
    expect(await repos.foodLibrary.count()).toBeGreaterThan(300)
  })

  it('parseImport 拒绝坏文件且不碰库', async () => {
    await repos.measurement.add({ date: '2026-03-01', type: 'weight', value: 70 })
    expect(() => parseImport('not json')).toThrow('JSON')
    expect(() => parseImport('{"schemaVersion":99}')).toThrow('版本')
    expect(() => parseImport('{"schemaVersion":1}')).toThrow('必要数据段')
    // 库未被触碰
    expect((await repos.measurement.listByType('weight')).length).toBe(1)
  })

  it('导入整库替换：旧数据不残留', async () => {
    await repos.measurement.add({ date: '2026-03-01', type: 'weight', value: 80 })
    const now = new Date().toISOString()
    await repos.profile.save({ id: 'profile', sex: 'female', birthYear: 1996, heightCm: 165, activityKey: 'light', createdAt: now, updatedAt: now })
    const fresh = await exportAll()
    // 当前库再写入额外记录
    await repos.measurement.add({ date: '2026-03-05', type: 'weight', value: 90 })
    // 导入旧快照 → 03-05 的 90 应消失
    await importAll(JSON.stringify(fresh))
    const ms = await repos.measurement.listByType('weight')
    expect(ms.length).toBe(1)
    expect(ms[0].value).toBe(80)
  })
})
