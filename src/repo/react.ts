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

export type AppPhase = 'loading' | 'onboarding' | 'ready' | 'error'

interface AppState {
  phase: AppPhase
  repos: Repos | null
  profile: Profile | null
  /** phase=error 时的人类可读原因 */
  errorMsg: string
}

/**
 * 启动状态机：开库 → 读档案 →（进入主界面后才）后台补种食物库。
 * 档案读取与食物库导入解耦：导入失败绝不影响已存档案的呈现（PWA 反馈的「每次重录」根因）。
 */
export function useAppBootstrap(): AppState {
  const [state, setState] = useState<AppState>({ phase: 'loading', repos: null, profile: null, errorMsg: '' })

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
        // 第一步：只读档案（关键路径，失败必须显式报错而非静默重录）
        const profile = await repos.profile.get()
        if (cancelled) return
        setState({ phase: profile ? 'ready' : 'onboarding', repos, profile, errorMsg: '' })
        // 第二步：食物库后台补种（幂等；失败只提示，不影响主界面）
        try {
          await seedFoodLibrary(repos)
        } catch (err) {
          console.warn('[qhelper] 内置食物库导入失败（不影响已有数据）：', err)
        }
      })
      .catch((err) => {
        // 开库/读档案失败：显式错误态（IndexedDB 被禁用、隐私模式等），绝不静默重录
        console.error('[qhelper] 存储初始化失败：', err)
        if (!cancelled) {
          setState({
            phase: 'error',
            repos: null,
            profile: null,
            errorMsg: '本机存储不可用（可能处于无痕/隐私模式，或浏览器禁用了站点数据）。请退出隐私模式、允许站点存储后刷新重试；已有数据不会丢失。',
          })
        }
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
  const ok = await saveProfileRecord(profile)
  if (!ok) {
    // 保存失败时不 reload——reload 会回到空 onboarding，造成「每次重录」的错觉
    throw new Error('save-failed')
  }
  window.location.reload()
}
