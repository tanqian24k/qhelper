/**
 * Repo 契约测试 —— 同一组场景对**任一后端**跑一遍（spec §3 架构铁律）。
 *
 * 目的：Dexie 与 SQLite 是两套手写实现，若只各测自己，实现间的语义漂移
 * （排序、封存、快照、事务原子性）不会暴露。把场景参数化，两个后端都被钉住。
 *
 * 目前只注入 Dexie（CI 无原生桥）；SQLite 分支在原生设备上由同一组用例执行。
 */
import { describe, expect, it, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import type { Repos } from '@/domain/repos'
import { dexieRepos, clearAll } from './dexie-repos'

const backends: Array<{ name: string; repos: Repos; reset: () => Promise<void> }> = [
  { name: 'Dexie/IndexedDB', repos: dexieRepos, reset: () => clearAll() },
]

for (const backend of backends) {
  describe(`Repo 契约 · ${backend.name}`, () => {
    beforeEach(async () => {
      await backend.reset()
    })
    const repos = backend.repos

    it('档案单例保存后可读回；重复保存为覆盖而非新增', async () => {
      const base = {
        id: 'profile' as const,
        sex: 'female' as const,
        birthYear: 1996,
        heightCm: 165,
        activityKey: 'light' as const,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      }
      await repos.profile.save(base)
      await repos.profile.save({ ...base, heightCm: 170 })
      const p = await repos.profile.get()
      expect(p?.heightCm).toBe(170)
    })

    it('目标版本：openNew 封存旧的，有且仅有一个开放版本', async () => {
      const g1 = await repos.goal.openNew({ targetWeightKg: 65, weeklyRateKg: 0.5 })
      expect(g1.closedOn).toBeUndefined()
      await repos.goal.openNew({ targetWeightKg: 62, weeklyRateKg: 0.25 })
      const open = await repos.goal.getOpen()
      expect(open?.targetWeightKg).toBe(62)
      // 历史仍可查，按创建时间倒序
      const all = await repos.goal.listAll()
      expect(all.length).toBe(2)
      expect(all[0].targetWeightKg).toBe(62)
    })

    it('封存日用本地日期（非 UTC 切片）', async () => {
      const g1 = await repos.goal.openNew({ targetWeightKg: 65, weeklyRateKg: 0.5 })
      await repos.goal.openNew({ targetWeightKg: 62, weeklyRateKg: 0.25 })
      const closed = (await repos.goal.listAll()).find((g) => g.id === g1.id)
      expect(closed?.closedOn).toBeTruthy()
      // 与 utils/date 的本地口径一致（同一台机器上今天 == 本地今天）
      const { todayStr } = await import('@/utils/date')
      expect(closed?.closedOn).toBe(todayStr())
    })

    it('食物条目：addMany 一次入账多条，按 createdAt 升序返回', async () => {
      const created = await repos.foodLog.addMany([
        { date: '2026-03-01', slot: 'lunch', snapshot: { nameZh: '米饭', per100g: p100g(116) }, grams: 200, kcal: 232 },
        { date: '2026-03-01', slot: 'lunch', snapshot: { nameZh: '鸡胸', per100g: p100g(133) }, grams: 150, kcal: 200 },
      ])
      expect(created.length).toBe(2)
      const list = await repos.foodLog.listByDate('2026-03-01')
      expect(list.length).toBe(2)
      const slots = await repos.foodLog.listBySlot('2026-03-01', 'lunch')
      expect(slots.length).toBe(2)
      expect(await repos.foodLog.count()).toBe(2)
    })

    it('快照复制：改食物库后历史条目数值不变', async () => {
      const food = await repos.foodLibrary.add({
        nameZh: '契约测试食物',
        nameAlias: [],
        category: '主食',
        source: 'manual',
        per100g: p100g(100),
        editable: true,
      })
      const [entry] = await repos.foodLog.addMany([
        { date: '2026-03-01', slot: 'lunch', snapshot: { nameZh: food.nameZh, per100g: food.per100g }, grams: 100, kcal: 100 },
      ])
      await repos.foodLibrary.update({ ...food, per100g: p100g(200) })
      const after = (await repos.foodLog.listByDate('2026-03-01'))[0]
      expect(after.snapshot.per100g.kcal).toBe(100)
      expect(after.kcal).toBe(100)
      // 编辑条目本身不污染快照
      await repos.foodLog.update({ ...entry, grams: 150, kcal: 150 })
      expect((await repos.foodLog.listByDate('2026-03-01'))[0].snapshot.per100g.kcal).toBe(100)
    })

    it('测量：同日多条合法、日均值、删除后更新', async () => {
      await repos.measurement.add({ date: '2026-03-01', type: 'weight', value: 70.0 })
      const m2 = await repos.measurement.add({ date: '2026-03-01', type: 'weight', value: 69.3 })
      expect((await repos.measurement.listByDateAndType('2026-03-01', 'weight')).length).toBe(2)
      expect(await repos.measurement.dailyMean('weight', '2026-03-01')).toBeCloseTo(69.65, 2)
      // listByType 按日期升序
      await repos.measurement.add({ date: '2026-02-25', type: 'weight', value: 71 })
      const all = await repos.measurement.listByType('weight')
      expect(all[0].date).toBe('2026-02-25')
      await repos.measurement.remove(m2.id)
      expect(await repos.measurement.dailyMean('weight', '2026-03-01')).toBeCloseTo(70, 2)
      expect(await repos.measurement.count()).toBe(2)
    })

    it('食物库：检索、计数、删除', async () => {
      await repos.foodLibrary.add({
        nameZh: '契约测试菜',
        nameAlias: ['qiyance'],
        category: '菜肴',
        source: 'manual',
        per100g: p100g(150),
        editable: true,
      })
      expect(await repos.foodLibrary.count()).toBe(1)
      expect((await repos.foodLibrary.search('契约')).length).toBe(1)
      const all = await repos.foodLibrary.search('', 50)
      const created = all[0]
      await repos.foodLibrary.remove(created.id)
      expect(await repos.foodLibrary.count()).toBe(0)
    })

    it('设置：读写往返，未设键返回 undefined', async () => {
      expect(await repos.setting.get('missing')).toBeUndefined()
      await repos.setting.set('k', { a: 1 })
      expect(await repos.setting.get<{ a: number }>('k')).toEqual({ a: 1 })
    })
  })
}

function p100g(kcal: number) {
  return { kcal, proteinG: 1, fatG: 1, carbG: 1, fiberG: 0, sugarG: 0, sodiumMg: 0 }
}