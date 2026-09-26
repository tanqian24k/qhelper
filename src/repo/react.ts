import { useEffect, useState } from 'react'
import type { Profile } from '@/domain/types'
import type { Repos } from '@/domain/repos'
import { createRepos } from '@/repo'

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
 * 启动状态机：读档案决定 onboarding 或主界面。
 * M1 阶段不含目标也能进主界面（目标引导在今日页内完成）。
 */
export function useAppBootstrap(): AppState {
  const [state, setState] = useState<AppState>({ phase: 'loading', repos: null, profile: null })

  useEffect(() => {
    let cancelled = false
    getOrCreateRepos()
      .then(async (repos) => {
        const profile = await repos.profile.get()
        if (!cancelled) setState({ phase: profile ? 'ready' : 'onboarding', repos, profile })
      })
      .catch(() => {
        // 存储不可用：M1 阶段仍放行主界面，页面内会显示空数据
        if (!cancelled) setState({ phase: 'onboarding', repos: null, profile: null })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

/** onboarding 完成后刷新状态（进入主界面） */
export function markOnboarded(profile: Profile): Promise<void> {
  return getOrCreateRepos().then(async (repos) => {
    await repos.profile.save(profile)
    window.location.reload()
  })
}
