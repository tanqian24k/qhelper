/**
 * 全库导出/导入 —— spec §2.7 防丢失生命线。
 * 导出 = 六表全量 JSON（带 schemaVersion + 导出时间）；
 * 导入 = 单事务内整库替换（清空后写入，保证中途失败不留半库）。
 */
import { db } from './dexie-repos'
import type { FoodEntry, FoodLibrary, GoalVersion, Measurement, Profile, Setting } from '@/domain/types'

export const EXPORT_SCHEMA_VERSION = 1

export interface ExportBundle {
  schemaVersion: number
  exportedAt: string
  profile: Profile | null
  goalVersions: GoalVersion[]
  foodLibrary: FoodLibrary[]
  foodEntries: FoodEntry[]
  measurements: Measurement[]
  settings: Setting[]
}

/** 全库导出 */
export async function exportAll(): Promise<ExportBundle> {
  const [profile, goalVersions, foodLibrary, foodEntries, measurements, settings] = await Promise.all([
    db.profile.get('profile'),
    db.goalVersion.toArray(),
    db.foodLibrary.toArray(),
    db.foodEntry.toArray(),
    db.measurement.toArray(),
    db.setting.toArray(),
  ])
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile: profile ?? null,
    goalVersions,
    foodLibrary,
    foodEntries,
    measurements,
    settings,
  }
}

/** 导出 → 下载文件（qhelper-backup-yyyyMMdd-HHmmss.json） */
export async function exportAndDownload(): Promise<string> {
  const bundle = await exportAll()
  const json = JSON.stringify(bundle)
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const name = `qhelper-backup-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
  return name
}

export interface ImportPreview {
  schemaVersion: number
  exportedAt: string
  counts: {
    profile: boolean
    goalVersions: number
    foodLibrary: number
    foodEntries: number
    measurements: number
    settings: number
  }
}

/** 解析并校验导入文件，返回预览（不写库） */
export function parseImport(text: string): ImportPreview {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('文件不是有效的 JSON')
  }
  const b = raw as Partial<ExportBundle>
  if (typeof b.schemaVersion !== 'number' || b.schemaVersion > EXPORT_SCHEMA_VERSION) {
    throw new Error(`不支持的备份版本：${String(b.schemaVersion)}`)
  }
  if (!Array.isArray(b.goalVersions) || !Array.isArray(b.foodEntries) || !Array.isArray(b.measurements)) {
    throw new Error('备份缺少必要数据段')
  }
  return {
    schemaVersion: b.schemaVersion,
    exportedAt: b.exportedAt ?? '(未知)',
    counts: {
      profile: b.profile != null,
      goalVersions: b.goalVersions.length,
      foodLibrary: b.foodLibrary?.length ?? 0,
      foodEntries: b.foodEntries.length,
      measurements: b.measurements.length,
      settings: b.settings?.length ?? 0,
    },
  }
}

/** 整库替换导入：单事务清空 + 写入；记录数必须与预览一致 */
export async function importAll(text: string): Promise<ImportPreview> {
  const preview = parseImport(text) // 先校验，失败不碰库
  const b = JSON.parse(text) as ExportBundle
  await db.transaction(
    'readwrite',
    [db.profile, db.goalVersion, db.foodLibrary, db.foodEntry, db.measurement, db.setting],
    async () => {
      await Promise.all([
        db.profile.clear(),
        db.goalVersion.clear(),
        db.foodLibrary.clear(),
        db.foodEntry.clear(),
        db.measurement.clear(),
        db.setting.clear(),
      ])
      if (b.profile) await db.profile.put(b.profile)
      if (b.goalVersions.length) await db.goalVersion.bulkPut(b.goalVersions)
      if (b.foodLibrary?.length) await db.foodLibrary.bulkPut(b.foodLibrary)
      if (b.foodEntries.length) await db.foodEntry.bulkPut(b.foodEntries)
      if (b.measurements.length) await db.measurement.bulkPut(b.measurements)
      if (b.settings?.length) await db.setting.bulkPut(b.settings)
    },
  )
  return preview
}
