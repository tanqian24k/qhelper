/**
 * React 侧的 Repo 单例 —— 页面只依赖领域接口（spec §3 架构铁律）。
 * M1 引入 dexie-react-hooks 后，liveQuery 将从这里取 repo。
 */
import type { Repos } from '@/domain/repos'
import { createRepos } from '@/repo'

let promise: Promise<Repos> | null = null

export function getOrCreateRepos(): Promise<Repos> {
  promise ??= Promise.resolve(createRepos())
  return promise
}
