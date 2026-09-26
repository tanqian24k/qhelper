import { useAppBootstrap } from '@/repo/react'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { TodayPage } from '@/pages/TodayPage'

export default function App() {
  const { phase, repos, profile } = useAppBootstrap()

  if (phase === 'loading') {
    return <main className="page"><p className="card-hint">加载中…</p></main>
  }
  if (phase === 'onboarding' || !repos || !profile) {
    return <OnboardingPage />
  }
  return <TodayPage repos={repos} profile={profile} />
}
