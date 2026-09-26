import { useEffect, useRef, useState } from 'react'
import type { Repos } from '@/domain/repos'
import { exportAndDownload, parseImport, importAll, type ImportPreview } from '@/repo/backup'
import { useEscape } from '@/hooks/useEscape'

export interface SettingsPageProps {
  /** 预留：后续设置项需要读写 Repo */
  repos?: Repos
}

/**
 * 设置页 —— spec §2.7：导出/导入生命线 + 持久存储状态。
 */
export function SettingsPage(_props: SettingsPageProps) {
  void _props
  const [persisted, setPersisted] = useState<'unknown' | 'yes' | 'no' | 'unsupported'>('unknown')
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
    if ('storage' in navigator && 'persist' in navigator.storage) {
      navigator.storage.persisted().then((p) => setPersisted(p ? 'yes' : 'no'))
    } else {
      setPersisted('unsupported')
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
          {persisted === 'yes' && '✓ 已获得持久存储授权，浏览器不会随意清理本应用数据。'}
          {persisted === 'no' && '尚未持久化：首次启动时已自动申请。若被拒绝，请将本站添加到主屏/书签后重试。'}
          {persisted === 'unsupported' && '当前浏览器不支持持久存储 API。'}
          {persisted === 'unknown' && '检测中…'}
        </p>
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
