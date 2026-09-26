import { useEffect } from 'react'

/** ESC 关闭弹层（是否真的关闭由调用方的 canClose 决定） */
export function useEscape(onEscape: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onEscape, enabled])
}
