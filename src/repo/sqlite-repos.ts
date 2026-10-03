/**
 * SQLite 实现 —— Repo 接口的原生端落地（spec §3 架构铁律 + M4）。
 *
 * 与 Dexie 实现的分工：Web 端走 dexie-repos.ts，原生壳走本文件；
 * UI 只依赖 domain/repos.ts 的接口，不知道底下是谁（见 repo/index.ts 的分流）。
 *
 * 设计取舍：六实体按「一行一实体、其余字段序列化 JSON」落库。
 * 理由——查询模式固定（按日期/类型/开放版本取），而实体内部有嵌套对象
 * （per100g、snapshot），拆成多列反而要在两套实现里维护两套列名映射。
 * 规模是个人使用（千条级），连接索引足够。
 */
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { randomUUID } from './uuid'
import { todayStr } from '@/utils/date'
import type {
  FoodEntry,
  FoodLibrary,
  GoalVersion,
  Measurement,
  Profile,
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

const DB_NAME = 'qhelper'
const DB_VERSION = 1

function nowIso(): string {
  return new Date().toISOString()
}

/** 建表 DDL：与 Dexie 六表一一对应 */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS profile (id TEXT PRIMARY KEY, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS goal_version (
     id TEXT PRIMARY KEY, closedOn TEXT, createdAt TEXT NOT NULL, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS food_library (id TEXT PRIMARY KEY, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS food_entry (
     id TEXT PRIMARY KEY, date TEXT NOT NULL, slot TEXT NOT NULL, createdAt TEXT NOT NULL, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS measurement (
     id TEXT PRIMARY KEY, date TEXT NOT NULL, type TEXT NOT NULL, createdAt TEXT NOT NULL, data TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS setting (key TEXT PRIMARY KEY, data TEXT NOT NULL)`,
  // 固定查询模式的索引（domain/repos.ts 里每个方法的 WHERE 都能命中其一）
  `CREATE INDEX IF NOT EXISTS ix_food_entry_date ON food_entry (date)`,
  `CREATE INDEX IF NOT EXISTS ix_measurement_type_date ON measurement (type, date)`,
  `CREATE INDEX IF NOT EXISTS ix_goal_closed ON goal_version (closedOn)`,
]

async function openDb(): Promise<SQLiteDBConnection> {
  const sqlite = new SQLiteConnection(CapacitorSQLite)
  // consistency: 数据库不可用时不静默退让，必须让上层显式报错（App.tsx 的 error 态）
  const consistency = await sqlite.checkConnectionsConsistency().catch(() => true)
  const isConn = (await sqlite.isConnection(DB_NAME, false)).result
  let db: SQLiteDBConnection
  if (!consistency || !isConn) {
    db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false)
    await db.open()
    await db.execute('PRAGMA foreign_keys = ON')
    for (const stmt of SCHEMA) await db.execute(stmt)
  } else {
    db = await sqlite.retrieveConnection(DB_NAME, false)
  }
  await sqlite.closeConnection(DB_NAME, false)
  return db
}

/** 打开并确保表存在的单例 Promise（与 Dexie 的 db 单例同构） */
let dbPromise: Promise<SQLiteDBConnection> | null = null
export function getSqliteDb(): Promise<SQLiteDBConnection> {
  dbPromise ??= openDb()
  return dbPromise
}

/**
 * 事务助手 —— 语义对齐 Dexie 的 `db.transaction`：
 * 全部成功才 commit，任一步抛错则整体 rollback（spec §2.7 导入「中途失败不留半库」）。
 */
async function inTransaction<T>(fn: (db: SQLiteDBConnection) => Promise<T>): Promise<T> {
  const db = await getSqliteDb()
  await db.beginTransaction()
  try {
    const out = await fn(db)
    await db.commitTransaction()
    return out
  } catch (err) {
    await db.rollbackTransaction().catch(() => undefined)
    throw err
  }
}

/** 供 SettingsPage 的表计数诊断使用 */
export async function tableCounts(): Promise<Record<string, number>> {
  const db = await getSqliteDb()
  const tables = ['profile', 'goal_version', 'food_library', 'food_entry', 'measurement', 'setting']
  const out: Record<string, number> = {}
  for (const t of tables) {
    const res = await db.query(`SELECT COUNT(*) AS n FROM ${t}`)
    out[t] = res.values?.[0]?.n ?? 0
  }
  return out
}

const profileRepo: ProfileRepo = {
  async get() {
    const db = await getSqliteDb()
    const res = await db.query('SELECT data FROM profile WHERE id = ?', ['profile'])
    const row = res.values?.[0] as { data?: string } | undefined
    return row?.data ? (JSON.parse(row.data) as Profile) : null
  },
  async save(profile) {
    const db = await getSqliteDb()
    const data = JSON.stringify({ ...profile, updatedAt: nowIso() })
    await db.run('INSERT OR REPLACE INTO profile (id, data) VALUES (?, ?)', ['profile', data])
  },
}

const goalRepo: GoalRepo = {
  async getOpen() {
    const db = await getSqliteDb()
    const res = await db.query('SELECT data FROM goal_version WHERE closedOn IS NULL ORDER BY createdAt DESC LIMIT 1')
    const row = res.values?.[0] as { data?: string } | undefined
    return row?.data ? (JSON.parse(row.data) as GoalVersion) : null
  },
  async listAll() {
    const db = await getSqliteDb()
    const res = await db.query('SELECT data FROM goal_version ORDER BY createdAt DESC')
    return (res.values ?? []).map((r) => JSON.parse((r as { data: string }).data) as GoalVersion)
  },
  async openNew(goal) {
    const db = await getSqliteDb()
    const open = await goalRepo.getOpen()
    if (open) {
      const closed = { ...open, closedOn: todayStr() }
      await db.run('UPDATE goal_version SET closedOn = ?, data = ? WHERE id = ?', [
        closed.closedOn!,
        JSON.stringify(closed),
        open.id,
      ])
    }
    const created: GoalVersion = {
      id: goal.id ?? randomUUID(),
      targetWeightKg: goal.targetWeightKg,
      weeklyRateKg: goal.weeklyRateKg,
      createdAt: nowIso(),
    }
    await db.run('INSERT INTO goal_version (id, closedOn, createdAt, data) VALUES (?, NULL, ?, ?)', [
      created.id,
      created.createdAt,
      JSON.stringify(created),
    ])
    return created
  },
}

const foodLibraryRepo: FoodLibraryRepo = {
  async get(id) {
    const db = await getSqliteDb()
    const res = await db.query('SELECT data FROM food_library WHERE id = ?', [id])
    const row = res.values?.[0] as { data?: string } | undefined
    return row?.data ? (JSON.parse(row.data) as FoodLibrary) : undefined
  },
  async search(query, limit = 50) {
    const db = await getSqliteDb()
    // 与 Dexie 版同口径：LIKE 匹配 nameZh/nameAlias 的小写子串
    const q = `%${query.trim().toLowerCase()}%`
    const res = await db.query(
      `SELECT data FROM food_library
       WHERE lower(json_extract(data, '$.nameZh')) LIKE ?
          OR lower(json_extract(data, '$.nameAlias')) LIKE ?
       LIMIT ?`,
      [q, q, limit],
    )
    return (res.values ?? []).map((r) => JSON.parse((r as { data: string }).data) as FoodLibrary)
  },
  async add(food) {
    const db = await getSqliteDb()
    const created: FoodLibrary = { ...food, id: food.id ?? randomUUID(), createdAt: nowIso(), updatedAt: nowIso() }
    await db.run('INSERT INTO food_library (id, data) VALUES (?, ?)', [created.id, JSON.stringify(created)])
    return created
  },
  async update(food) {
    const db = await getSqliteDb()
    await db.run('UPDATE food_library SET data = ? WHERE id = ?', [
      JSON.stringify({ ...food, updatedAt: nowIso() }),
      food.id,
    ])
  },
  async remove(id) {
    const db = await getSqliteDb()
    await db.run('DELETE FROM food_library WHERE id = ?', [id])
  },
  async count() {
    const db = await getSqliteDb()
    const res = await db.query('SELECT COUNT(*) AS n FROM food_library')
    return res.values?.[0]?.n ?? 0
  },
}

const foodLogRepo: FoodLogRepo = {
  async listByDate(date) {
    const db = await getSqliteDb()
    const res = await db.query('SELECT data FROM food_entry WHERE date = ? ORDER BY createdAt ASC', [date])
    return (res.values ?? []).map((r) => JSON.parse((r as { data: string }).data) as FoodEntry)
  },
  async listBySlot(date, slot) {
    const db = await getSqliteDb()
    const res = await db.query(
      'SELECT data FROM food_entry WHERE date = ? AND slot = ? ORDER BY createdAt ASC',
      [date, slot],
    )
    return (res.values ?? []).map((r) => JSON.parse((r as { data: string }).data) as FoodEntry)
  },
  async addMany(entries) {
    const created = entries.map((e) => ({
      ...e,
      id: e.id ?? randomUUID(),
      createdAt: e.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    }))
    await inTransaction(async (db) => {
      for (const c of created) {
        await db.run('INSERT INTO food_entry (id, date, slot, createdAt, data) VALUES (?, ?, ?, ?, ?)', [
          c.id,
          c.date,
          c.slot,
          c.createdAt,
          JSON.stringify(c),
        ])
      }
    })
    return created
  },
  async update(entry) {
    const db = await getSqliteDb()
    await db.run('UPDATE food_entry SET data = ? WHERE id = ?', [
      JSON.stringify({ ...entry, updatedAt: nowIso() }),
      entry.id,
    ])
  },
  async remove(id) {
    const db = await getSqliteDb()
    await db.run('DELETE FROM food_entry WHERE id = ?', [id])
  },
  async count() {
    const db = await getSqliteDb()
    const res = await db.query('SELECT COUNT(*) AS n FROM food_entry')
    return res.values?.[0]?.n ?? 0
  },
}

const measurementRepo: MeasurementRepo = {
  async listByDateAndType(date, type) {
    const db = await getSqliteDb()
    const res = await db.query(
      'SELECT data FROM measurement WHERE type = ? AND date = ? ORDER BY createdAt ASC',
      [type, date],
    )
    return (res.values ?? []).map((r) => JSON.parse((r as { data: string }).data) as Measurement)
  },
  async listByType(type) {
    const db = await getSqliteDb()
    const res = await db.query(
      'SELECT data FROM measurement WHERE type = ? ORDER BY date ASC, createdAt ASC',
      [type],
    )
    return (res.values ?? []).map((r) => JSON.parse((r as { data: string }).data) as Measurement)
  },
  async add(m) {
    const db = await getSqliteDb()
    const created: Measurement = { ...m, id: m.id ?? randomUUID(), createdAt: m.createdAt ?? nowIso() }
    await db.run('INSERT INTO measurement (id, date, type, createdAt, data) VALUES (?, ?, ?, ?, ?)', [
      created.id,
      created.date,
      created.type,
      created.createdAt,
      JSON.stringify(created),
    ])
    return created
  },
  async remove(id) {
    const db = await getSqliteDb()
    await db.run('DELETE FROM measurement WHERE id = ?', [id])
  },
  async dailyMean(type, date) {
    const list = await measurementRepo.listByDateAndType(date, type)
    if (list.length === 0) return undefined
    return list.reduce((s, m) => s + m.value, 0) / list.length
  },
  async count() {
    const db = await getSqliteDb()
    const res = await db.query('SELECT COUNT(*) AS n FROM measurement')
    return res.values?.[0]?.n ?? 0
  },
}

const settingRepo: SettingRepo = {
  async get<T>(key: string) {
    const db = await getSqliteDb()
    const res = await db.query('SELECT data FROM setting WHERE key = ?', [key])
    const row = res.values?.[0] as { data?: string } | undefined
    return row?.data ? (JSON.parse(row.data) as T) : undefined
  },
  async set(key, value) {
    const db = await getSqliteDb()
    await db.run('INSERT OR REPLACE INTO setting (key, data) VALUES (?, ?)', [key, JSON.stringify(value)])
  },
}

export const sqliteRepos: Repos = {
  profile: profileRepo,
  goal: goalRepo,
  foodLibrary: foodLibraryRepo,
  foodLog: foodLogRepo,
  measurement: measurementRepo,
  setting: settingRepo,
}

/** 测试/导入用：清空全部表 */
export async function clearAllSqlite(): Promise<void> {
  const tables = ['profile', 'goal_version', 'food_library', 'food_entry', 'measurement', 'setting']
  await inTransaction(async (db) => {
    for (const t of tables) await db.execute(`DELETE FROM ${t}`)
  })
}