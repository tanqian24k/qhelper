// 正式应用图标生成：绿色圆角底 + 白色爱心（健康记录主题），支持 maskable 安全区。
// 用法：node scripts/gen-icons.mjs
import { writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

const GREEN = [0x16, 0xa3, 0x4a]
const GREEN_DARK = [0x11, 0x7d, 0x3c]

/**
 * 心形隐式曲线：(x² + y² − 1)³ − x²·y³ ≤ 0，坐标归一到 [-1.3, 1.3]。
 * 返回该点是否在心形内（做了轻微收缩留白）。
 */
function inHeart(nx, ny) {
  // 归一坐标 → 心形坐标系（y 翻转，图像 y 向下）
  const x = nx / 1.35
  const y = -ny / 1.35
  const a = x * x + y * y - 1
  return a * a * a - x * x * y * y * y <= 0
}

function gen(size, file, { maskable = false } = {}) {
  const png = new PNG({ width: size, height: size })
  const r = Math.round(size * (maskable ? 0 : 0.22)) // maskable 需全出血
  const cx = size / 2
  const cy = size / 2
  // 渐变 + 心形缩放系数（maskable 时缩小到安全区 80%）
  const heartScale = maskable ? 0.62 : 0.78
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2
      // 圆角裁剪（maskable 不裁）
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
      // 对角渐变底
      const t = (x + y) / (2 * size)
      const base = [
        Math.round(GREEN[0] + (GREEN_DARK[0] - GREEN[0]) * t),
        Math.round(GREEN[1] + (GREEN_DARK[1] - GREEN[1]) * t),
        Math.round(GREEN[2] + (GREEN_DARK[2] - GREEN[2]) * t),
      ]
      // 心形（以画面中心为基准，纵向略上移视觉平衡）
      const inH = inHeart(
        (x - cx) / (size * heartScale),
        (y - cy * 1.06) / (size * heartScale),
      )
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
