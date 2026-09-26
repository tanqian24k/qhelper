// M0 占位图标生成：绿色圆角方块 + 白色圆点。一次性脚本，不入构建。
// 用法：node scripts/gen-icons.mjs
import { writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

function gen(size, file) {
  const png = new PNG({ width: size, height: size })
  const r = Math.round(size * 0.22) // 圆角半径
  const dotR = Math.round(size * 0.18)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2
      // 圆角判断：四角外透明
      const cx = Math.min(x, size - 1 - x)
      const cy = Math.min(y, size - 1 - y)
      let inside = true
      if (cx < r && cy < r) {
        const dx = r - cx
        const dy = r - cy
        inside = dx * dx + dy * dy <= r * r
      }
      if (!inside) {
        png.data[idx + 3] = 0
        continue
      }
      // 中心白色圆点
      const ddx = x - size / 2
      const ddy = y - size / 2
      if (ddx * ddx + ddy * ddy < dotR * dotR) {
        png.data[idx] = 0xff
        png.data[idx + 1] = 0xff
        png.data[idx + 2] = 0xff
        png.data[idx + 3] = 0xff
      } else {
        png.data[idx] = 0x16
        png.data[idx + 1] = 0xa3
        png.data[idx + 2] = 0x4a
        png.data[idx + 3] = 0xff
      }
    }
  }
  writeFileSync(file, PNG.sync.write(png))
  console.log(file)
}

for (const s of [192, 512]) {
  gen(s, `public/icon-${s}.png`)
}
