/**
 * Repo 工厂 —— UI 只 import 这里，不 import 具体存储实现细节（spec §3 架构铁律）。
 *
 * 双后端（grilling 裁决）：Web 端走 Dexie/IndexedDB，原生壳走 capacitor-sqlite。
 * 分流依据是 Capacitor 运行时注入的原生桥是否存在，而非构建期常量——
 * 页面逻辑对「自己在哪」无感知，Repo 接口是唯一契约。
 */
import { Capacitor } from '@capacitor/core'
import type { Repos } from '@/domain/repos'
import { dexieRepos } from './dexie-repos'
import { sqliteRepos } from './sqlite-repos'

let cached: Repos | null = null

/** 原生壳（Capacitor Android/iOS）？是则走 SQLite，否则走 IndexedDB */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export function createRepos(): Repos {
  if (cached === null) {
    cached = isNativePlatform() ? sqliteRepos : dexieRepos
  }
  return cached
}