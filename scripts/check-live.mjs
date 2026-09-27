// 线上部署内容检查：CSS 是否含 FAB 修复与 TabBar 规则
const base = 'https://tanqian24k.github.io'
const html = await (await fetch(base + '/qhelper/')).text()
const m = html.match(/href="(\/qhelper\/assets\/index-[^"]+\.css)"/)
if (!m) {
  console.log('css link not found')
} else {
  const css = await (await fetch(base + m[1])).text()
  console.log('live css:', m[1])
  console.log('FAB lifted (bottom:calc(var(--tabbar-h)):', css.includes('bottom:calc(var(--tabbar-h)'))
  console.log('FAB z-index 45:', css.includes('z-index:45'))
  console.log('page padding clears tabbar:', css.includes('calc(var(--tabbar-h) + env(safe-area-inset-bottom,0px) + 20px)'))
  console.log('tab-bar fixed rule:', css.includes('.tab-bar{position:fixed'))
}
const jsMatch = html.match(/src="(\/qhelper\/assets\/index-[^"]+\.js)"/)
if (jsMatch) {
  const js = await (await fetch(base + jsMatch[1])).text()
  console.log('JS has tabbar-on:', js.includes('tabbar-on'))
  console.log('JS has explicit storage error state:', js.includes('存储不可用'))
}
