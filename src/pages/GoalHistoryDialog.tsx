import { useEffect, useState } from 'react'
import type { GoalVersion } from '@/domain/types'
import type { Repos } from '@/domain/repos'
import { useEscape } from '@/hooks/useEscape'

export interface GoalHistoryDialogProps {
  repos: Repos
  onClose: () => void
}

/** 目标历史版本列表 —— spec §2.2：保存新目标 = 封存旧版本 + 生效新版本，历史可查 */
export function GoalHistoryDialog({ repos, onClose }: GoalHistoryDialogProps) {
  const [versions, setVersions] = useState<GoalVersion[]>([])
  const [loaded, setLoaded] = useState(false)

  useEscape(onClose)

  useEffect(() => {
    void repos.goal.listAll().then((vs) => {
      setVersions(vs)
      setLoaded(true)
    })
  }, [repos])

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="目标历史版本">
        <h2 className="dialog-title">目标历史版本</h2>
        {!loaded && <p className="card-hint">加载中…</p>}
        {loaded && versions.length === 0 && <p className="card-hint">还没有任何目标版本</p>}
        <ul className="history-list">
          {versions.map((v) => (
            <li key={v.id} className="history-item">
              <span className="history-main">
                目标 {v.targetWeightKg} kg · −{v.weeklyRateKg} kg/周
              </span>
              <span className="card-hint">
                {v.closedOn ? `${v.closedOn} 封存` : '当前生效'}
              </span>
            </li>
          ))}
        </ul>
        <div className="dialog-actions">
          <button className="btn-ghost" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
