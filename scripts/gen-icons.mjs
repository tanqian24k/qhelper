// 正式应用图标生成：绿色渐变圆角底 + 白色爱心（健康记录主题），支持 maskable 安全区。
// 用法：node scripts/gen-icons.mjs
import { writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const GREEN = [0x16, 0xa3, 0x4a]
const GREEN_DARK = [0x11, 0x7d, 0x3c]

/**
 * 心形隐式曲线：(x² + y² − 1)³ − x²·y³ ≤ 0（曲线空间，y 向上）。
 * 曲线范围约 |x| ≤ 1，y ∈ [−0.95, 0.97]。
 */
function inHeart(nx, ny) {
  const x = nx
  const y = -ny // 图像 y 向下 → 曲线 y 向上
  const a = x * x + y * y - 1
  return a * a * a - x * x * y * y * y <= 0
}

function gen(size, file, { maskable = false } = {}) {
  const png = new PNG({ width: size, height: size })
  const r = maskable ? 0 : Math.round(size * 0.22) // maskable 全出血不裁角
  const cx = size / 2
  // 心占画布约 72% 宽；maskable 缩到 ~56%（安全区内）
  const half = size * (maskable ? 0.28 : 0.36)
  const cy = size * 0.52 // 视觉中心略下移
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2
      if (r > 0) {
        const cxr = Math.min(x, size - 1 - x)
        const cyr = Math.min(y, size - 1 - y)
        if (cxr < r && cyr < r) {
          const dx = r - cxr
          const dy = r - cyr
          if (dx * dx + dy * dy > r * r) {
            png.data[idx + 3] = 0
            continue
          }
        }
      }
      const t = (x + y) / (2 * size)
      const base = [
        Math.round(GREEN[0] + (GREEN_DARK[0] - GREEN[0]) * t),
        Math.round(GREEN[1] + (GREEN_DARK[1] - GREEN[1]) * t),
        Math.round(GREEN[2] + (GREEN_DARK[2] - GREEN[2]) * t),
      ]
      const inH = inHeart((x - cx) / half, (y - cy) / half)
      const c = inH ? [0xff, 0xff, 0xff] : base
      png.data[idx] = c[0]
      png.data[idx + 1] = c[1]
      png.data[idx + 2] = c[2]
      png.data[idx + 3] = 0xff
    }
  }
  writeFileSync(file, PNG.sync.write(png))
  console.log(file)
}

gen(192, 'public/icon-192.png')
gen(512, 'public/icon-512.png')
gen(512, 'public/icon-512-maskable.png', { maskable: true })
