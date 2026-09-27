// Android 自适应图标生成：从 maskable 母版（心形已在安全区内）派生 foreground/background
import { PNG } from 'pngjs'
import fs from 'node:fs'

const master = PNG.sync.read(fs.readFileSync('public/icon-512-maskable.png'))

function resize(size) {
  const out = new PNG({ width: size, height: size })
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.min(Math.floor((x * size) / master.width), master.width - 1)
      const sy = Math.min(Math.floor((y * size) / master.height), master.height - 1)
      const si = (master.width * sy + sx) << 2
      const di = (size * y + x) << 2
      for (let c = 0; c < 4; c++) out.data[di + c] = master.data[si + c]
    }
  }
  return out
}

// foreground 画布是 108dp（各密度像素见下），心形已缩至安全区，整幅使用
const densities = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 }
for (const [d, s] of Object.entries(densities)) {
  const dir = `android/app/src/main/res/mipmap-${d}`
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(`${dir}/ic_launcher_foreground.png`, PNG.sync.write(resize(s)))
  // background 用纯绿色铺满
  const bg = new PNG({ width: s, height: s })
  for (let i = 0; i < s * s; i++) {
    const idx = i << 2
    bg.data[idx] = 0x16
    bg.data[idx + 1] = 0xa3
    bg.data[idx + 2] = 0x4a
    bg.data[idx + 3] = 0xff
  }
  fs.writeFileSync(`${dir}/ic_launcher_background.png`, PNG.sync.write(bg))
  console.log(d, `${s}px done`)
}

const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`
fs.writeFileSync('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml', xml)
fs.writeFileSync('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml', xml)
console.log('adaptive icon xml updated')
