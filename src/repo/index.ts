/**
 * Repo 工厂 —— UI 只 import 这里，不 import Dexie 实现细节。
 * 将来移动端换 capacitor-sqlite 时只需改 createRepos 的实现选择。
 */
import type { Repos } from '@/domain/repos'
import { dexieRepos } from './dexie-repos'

let cached: Repos | null = null

export function createRepos(): Repos {
  if (cached === null) {
    cached = dexieRepos
  }
  return cached
}
