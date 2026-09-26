import { useEffect, useState } from 'react'
import type { Profile } from '@/domain/types'
import type { Repos } from '@/domain/repos'
import { createRepos } from '@/repo'
import { seedFoodLibrary } from './seed'

let reposPromise: Promise<Repos> | null = null

/** Repo 单例（异步形态，供页面/hook 使用） */
export function getOrCreateRepos(): Promise<Repos> {
  reposPromise ??= Promise.resolve(createRepos())
  return reposPromise
}

export type AppPhase = 'loading' | 'onboarding' | 'ready'

interface AppState {
  phase: AppPhase
  repos: Repos | null
  profile: Profile | null
}

/**
 * 启动状态机：开库 → 首启导入内置食物库 → 读档案决定 onboarding 或主界面。
 * M1 阶段不含目标也能进主界面（目标引导在今日页内完成）。
 */
export function useAppBootstrap(): AppState {
  const [state, setState] = useState<AppState>({ phase: 'loading', repos: null, profile: null })

  useEffect(() => {
    let cancelled = false
    // 持久存储申请（spec §2.7 / 01 号票：iOS 可能回收未持久化的 IndexedDB）
    try {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        void navigator.storage.persist()
      }
    } catch {
      // 申请失败不阻塞启动
    }
    getOrCreateRepos()
      .then(async (repos) => {
        await seedFoodLibrary(repos)
        const profile = await repos.profile.get()
        if (!cancelled) setState({ phase: profile ? 'ready' : 'onboarding', repos, profile })
      })
      .catch(() => {
        // 存储不可用：仍进入 onboarding，页面内会展示对应错误态
        if (!cancelled) setState({ phase: 'onboarding', repos: null, profile: null })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

/** 保存档案（onboarding 完成 / 设置修改）。返回是否成功，由调用方刷新界面状态。 */
export async function saveProfileRecord(profile: Profile): Promise<boolean> {
  try {
    const repos = await getOrCreateRepos()
    await repos.profile.save(profile)
    return true
  } catch {
    return false
  }
}

/** onboarding 完成后刷新进入主界面 */
export async function markOnboarded(profile: Profile): Promise<void> {
  await saveProfileRecord(profile)
  window.location.reload()
}
