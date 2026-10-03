import { useEffect, useRef, useState } from 'react'
import type { Repos } from '@/domain/repos'
import { exportAndDownload, parseImport, importAll, type ImportPreview } from '@/repo/backup'
import { useEscape } from '@/hooks/useEscape'
import { getOrCreateRepos } from '@/repo/react'

export interface SettingsPageProps {
  /** 预留：后续设置项需要读写 Repo */
  repos?: Repos
}

interface StorageDiag {
  persisted: 'unknown' | 'yes' | 'no' | 'unsupported'
  /** 配额估算（字节） */
  usage: number | null
  quota: number | null
  /** 档案 updatedAt——判断「数据是否被清」的关键证据 */
  profileUpdatedAt: string | null
  /** 各表行数 */
  counts: { foodLibrary: number; foodEntries: number; measurements: number; goalVersions: number } | null
  /** 读写自检结果 */
  roundtrip: 'ok' | 'fail' | 'testing'
}

/**
 * 设置页 —— spec §2.7：导出/导入生命线 + 持久存储状态 + 存储诊断。
 */
export function SettingsPage(_props: SettingsPageProps) {
  void _props
  const [diag, setDiag] = useState<StorageDiag>({
    persisted: 'unknown',
    usage: null,
    quota: null,
    profileUpdatedAt: null,
    counts: null,
    roundtrip: 'testing',
  })
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<{ text: string; info: ImportPreview } | null>(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  useEscape(() => {
    setImporting(false)
    setPreview(null)
  }, importing && preview !== null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const d: Partial<StorageDiag> = {}
      // 持久化状态 + 配额
      try {
        if ('storage' in navigator && 'persisted' in navigator.storage) {
          d.persisted = (await navigator.storage.persisted()) ? 'yes' : 'no'
        } else {
          d.persisted = 'unsupported'
        }
        if ('estimate' in navigator.storage) {
          const est = await navigator.storage.estimate()
          d.usage = est.usage ?? null
          d.quota = est.quota ?? null
        }
      } catch {
        d.persisted = 'unsupported'
      }
      // 数据库实况：档案时间戳 + 各表行数 + 读写自检
      try {
        const repos = await getOrCreateRepos()
        const profile = await repos.profile.get()
        d.profileUpdatedAt = profile?.updatedAt ?? null
        d.counts = {
          foodLibrary: await repos.foodLibrary.count(),
          foodEntries: await countEntries(),
          measurements: await countMeasurements(),
          goalVersions: (await repos.goal.listAll()).length,
        }
        // 读写自检：写一个探针值再读回
        const probeKey = `diag:${Date.now()}`
        await repos.setting.set(probeKey, 'probe')
        const back = await repos.setting.get<string>(probeKey)
        await repos.setting.set(probeKey, null)
        d.roundtrip = back === 'probe' ? 'ok' : 'fail'
      } catch {
        d.roundtrip = 'fail'
      }
      if (!cancelled) setDiag((prev) => ({ ...prev, ...d }))
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  async function doExport() {
    setError('')
    setMsg('')
    try {
      const name = await exportAndDownload()
      setMsg(`已导出 ${name}（请妥善保存，换设备/清缓存靠它恢复）`)
    } catch {
      setError('导出失败，请重试')
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setMsg('')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result)
        setPreview({ text, info: parseImport(text) })
        setImporting(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : '文件无法解析')
      }
    }
    reader.readAsText(file)
    e.target.value = '' // 允许重复选同一文件
  }

  async function confirmImport() {
    if (!preview) return
    try {
      await importAll(preview.text)
      setImporting(false)
      setPreview(null)
      window.location.reload()
    } catch (err) {
      setImporting(false)
      setError(err instanceof Error ? err.message : '导入失败')
    }
  }


  return (
    <main className="page">
      <header className="page-header">
        <h1>设置</h1>
      </header>

      <section className="card" aria-label="数据备份">
        <p className="card-label">数据备份（防丢失生命线）</p>
        <p className="card-hint">
          所有数据仅存本机。换设备或清浏览器数据前，先导出 JSON；导入会**整库替换**当前数据。
        </p>
        <div className="dialog-actions">
          <button className="btn-primary" onClick={doExport}>导出全部数据</button>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>从文件导入</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onPickFile} />
        </div>
        {msg && <p className="card-hint ok-msg">✓ {msg}</p>}
        {error && <p className="form-error">{error}</p>}
      </section>

      <section className="card" aria-label="持久存储">
        <p className="card-label">持久存储</p>
        <p className="card-hint">
          {diag.persisted === 'yes' && '✓ 已获得持久存储授权，浏览器不会随意清理本应用数据。'}
          {diag.persisted === 'no' && '⚠ 尚未持久化：浏览器可能在空间不足时清理本站数据。建议将本站添加到主屏后重试。'}
          {diag.persisted === 'unsupported' && '当前浏览器不支持持久存储 API。'}
          {diag.persisted === 'unknown' && '检测中…'}
        </p>
        <p className="card-hint">
          {diag.usage !== null && diag.quota !== null && (
            <>占用 {(diag.usage / 1024).toFixed(0)} KB / 配额 {(diag.quota / 1024 / 1024).toFixed(0)} MB · </>
          )}
          读写自检：{diag.roundtrip === 'ok' && '✓ 正常'}
          {diag.roundtrip === 'fail' && '✗ 失败（存储被禁用或已满）'}
          {diag.roundtrip === 'testing' && '检测中…'}
        </p>
        <p className="card-hint">
          {diag.profileUpdatedAt ? (
            <>档案最后保存：{new Date(diag.profileUpdatedAt).toLocaleString('zh-CN')}</>
          ) : (
            '尚无档案（未完成 onboarding 或已被清除）'
          )}
        </p>
        {diag.counts && (
          <p className="card-hint">
            食物库 {diag.counts.foodLibrary} 条 · 饮食记录 {diag.counts.foodEntries} 条 · 测量 {diag.counts.measurements} 条 · 目标版本 {diag.counts.goalVersions} 个
          </p>
        )}
        {diag.profileUpdatedAt && diag.persisted === 'no' && (
          <p className="form-error">
            诊断：档案存在但未获持久化授权——若每次进入都要求重录，说明浏览器在会话间清除了站点数据。请在浏览器设置中允许本站存储/将本站加入书签，或联系开发者进一步排查。
          </p>
        )}
      </section>

      {preview && (
        <ImportConfirmDialog
          preview={preview.info}
          onConfirm={confirmImport}
          onCancel={() => {
            setImporting(false)
            setPreview(null)
          }}
        />
      )}
    </main>
  )
}

/**
 * 记录总数（诊断用）—— 经 Repo 接口取，不直接 import 具体实现，
 * 这样原生壳走 SQLite 时同样可用（spec §3 架构铁律）。
 */
async function countEntries(): Promise<number> {
  const repos = await getOrCreateRepos()
  return repos.foodLog.count()
}

/** 测量记录总数 */
async function countMeasurements(): Promise<number> {
  const repos = await getOrCreateRepos()
  return repos.measurement.count()
}

/** 导入确认弹层（设置页内使用） */
export function ImportConfirmDialog({ preview, onConfirm, onCancel }: {
  preview: ImportPreview
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="确认导入">
        <h2 className="dialog-title">确认导入？</h2>
        <p className="card-hint">
          备份时间：{preview.exportedAt}
          <br />
          导入将**清空当前全部数据**并替换为备份内容：
        </p>
        <ul className="history-list">
          <li className="history-item"><span>档案</span><span>{preview.counts.profile ? '1 份' : '无'}</span></li>
          <li className="history-item"><span>目标版本</span><span>{preview.counts.goalVersions}</span></li>
          <li className="history-item"><span>食物库</span><span>{preview.counts.foodLibrary}</span></li>
          <li className="history-item"><span>食物条目</span><span>{preview.counts.foodEntries}</span></li>
          <li className="history-item"><span>身体测量</span><span>{preview.counts.measurements}</span></li>
          <li className="history-item"><span>设置</span><span>{preview.counts.settings}</span></li>
        </ul>
        <div className="dialog-actions">
          <button className="btn-ghost" onClick={onCancel}>取消</button>
          <button className="btn-primary" onClick={onConfirm}>确认导入（整库替换）</button>
        </div>
      </div>
    </div>
  )
}
