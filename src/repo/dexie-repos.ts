/**
 * Dexie 实现 —— Repo 接口的 Web 端落地（spec §3）。
 * 六实体六表（spec §4）；移动端将来换 capacitor-sqlite 时只换这个文件所在的实现层。
 */
import Dexie, { type EntityTable } from 'dexie'
import { randomUUID } from './uuid'
import { todayStr } from '@/utils/date'
import type {
  FoodEntry,
  FoodLibrary,
  GoalVersion,
  Measurement,
  Profile,
  Setting,
} from '@/domain/types'
import type {
  FoodLibraryRepo,
  FoodLogRepo,
  GoalRepo,
  MeasurementRepo,
  ProfileRepo,
  Repos,
  SettingRepo,
} from '@/domain/repos'

export class QHelperDb extends Dexie {
  profile!: EntityTable<Profile, 'id'>
  goalVersion!: EntityTable<GoalVersion, 'id'>
  foodLibrary!: EntityTable<FoodLibrary, 'id'>
  foodEntry!: EntityTable<FoodEntry, 'id'>
  measurement!: EntityTable<Measurement, 'id'>
  setting!: EntityTable<Setting, 'key'>

  constructor() {
    super('qhelper')
    this.version(1).stores({
      profile: 'id',
      goalVersion: 'id, closedOn, createdAt',
      foodLibrary: 'id, nameZh, category, source',
      foodEntry: 'id, date, [date+slot], createdAt',
      measurement: 'id, [type+date], type, date',
      setting: 'key',
    })
  }
}

export const db = new QHelperDb()

const nowIso = () => new Date().toISOString()

const profileRepo: ProfileRepo = {
  async get() {
    return (await db.profile.get('profile')) ?? null
  },
  async save(profile) {
    await db.profile.put({ ...profile, updatedAt: nowIso() })
  },
}

const goalRepo: GoalRepo = {
  async getOpen() {
    return (await db.goalVersion.filter((g) => !g.closedOn).last()) ?? null
  },
  async listAll() {
    const all = await db.goalVersion.toArray()
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  async openNew(goal) {
    return db.transaction('readwrite', db.goalVersion, async () => {
      const open = await goalRepo.getOpen()
      if (open) {
        await db.goalVersion.update(open.id, { closedOn: todayStr() })
      }
      const created: GoalVersion = {
        id: goal.id ?? randomUUID(),
        targetWeightKg: goal.targetWeightKg,
        weeklyRateKg: goal.weeklyRateKg,
        createdAt: nowIso(),
      }
      await db.goalVersion.add(created)
      return created
    })
  },
}

const foodLibraryRepo: FoodLibraryRepo = {
  async get(id) {
    return db.foodLibrary.get(id)
  },
  async search(query, limit = 50) {
    const all = await db.foodLibrary.toArray()
    const q = query.trim().toLowerCase()
    const matched = q
      ? all.filter(
          (f) =>
            f.nameZh.toLowerCase().includes(q) ||
            f.nameAlias.some((a) => a.toLowerCase().includes(q)),
        )
      : all
    // 常用条目（source=manual 高频菜肴/自定义）置顶的粗排：保持库序，仅按名称长度稳定排序优化展示
    return matched.slice(0, limit)
  },
  async add(food) {
    const created: FoodLibrary = {
      ...food,
      id: food.id ?? randomUUID(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    await db.foodLibrary.add(created)
    return created
  },
  async update(food) {
    await db.foodLibrary.put({ ...food, updatedAt: nowIso() })
  },
  async remove(id) {
    await db.foodLibrary.delete(id)
  },
  async count() {
    return db.foodLibrary.count()
  },
}

const foodLogRepo: FoodLogRepo = {
  async listByDate(date) {
    const entries = await db.foodEntry.where('date').equals(date).toArray()
    return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },
  async listBySlot(date, slot) {
    const entries = await db.foodEntry.where('[date+slot]').equals([date, slot]).toArray()
    return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },
  async addMany(entries) {
    const created = entries.map((e) => ({
      ...e,
      id: e.id ?? randomUUID(),
      createdAt: e.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    }))
    await db.foodEntry.bulkAdd(created)
    return created
  },
  async update(entry) {
    await db.foodEntry.put({ ...entry, updatedAt: nowIso() })
  },
  async remove(id) {
    await db.foodEntry.delete(id)
  },
  async count() {
    return db.foodEntry.count()
  },
}

const measurementRepo: MeasurementRepo = {
  async listByDateAndType(date, type) {
    const list = await db.measurement.where('[type+date]').equals([type, date]).toArray()
    return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },
  async listByType(type) {
    const list = await db.measurement.where('type').equals(type).toArray()
    return list.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
  },
  async add(m) {
    const created: Measurement = {
      ...m,
      id: m.id ?? randomUUID(),
      createdAt: m.createdAt ?? nowIso(),
    }
    await db.measurement.add(created)
    return created
  },
  async remove(id) {
    await db.measurement.delete(id)
  },
  async dailyMean(type, date) {
    const list = await measurementRepo.listByDateAndType(date, type)
    if (list.length === 0) return undefined
    return list.reduce((s, m) => s + m.value, 0) / list.length
  },
  async count() {
    return db.measurement.count()
  },
}

const settingRepo: SettingRepo = {
  async get<T>(key: string) {
    const row = await db.setting.get(key)
    return row?.value as T | undefined
  },
  async set(key, value) {
    await db.setting.put({ key, value })
  },
}

export const dexieRepos: Repos = {
  profile: profileRepo,
  goal: goalRepo,
  foodLibrary: foodLibraryRepo,
  foodLog: foodLogRepo,
  measurement: measurementRepo,
  setting: settingRepo,
}

/** 测试/导入用：清空全部表 */
export async function clearAll(): Promise<void> {
  await db.transaction('readwrite', [db.profile, db.goalVersion, db.foodLibrary, db.foodEntry, db.measurement, db.setting], async () => {
    await Promise.all([
      db.profile.clear(),
      db.goalVersion.clear(),
      db.foodLibrary.clear(),
      db.foodEntry.clear(),
      db.measurement.clear(),
      db.setting.clear(),
    ])
  })
}
