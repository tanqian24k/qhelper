import { useAppBootstrap } from '@/repo/react'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { TodayPage } from '@/pages/TodayPage'

export default function App() {
  const { phase, repos, profile, errorMsg } = useAppBootstrap()

  if (phase === 'loading') {
    return <main className="page"><p className="card-hint">加载中…</p></main>
  }
  // 存储不可用：显式报错（绝不静默回 onboarding 让用户重录）
  if (phase === 'error') {
    return (
      <main className="page">
        <section className="card">
          <p className="card-label">无法访问本机存储</p>
          <p className="form-error">{errorMsg}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>重试</button>
        </section>
      </main>
    )
  }
  if (phase === 'onboarding' || !repos || !profile) {
    return <OnboardingPage />
  }
  return <TodayPage repos={repos} profile={profile} />
}
