// 线上部署内容检查：诊断功能是否上线
const base = 'https://tanqian24k.github.io'
const html = await (await fetch(base + '/qhelper/')).text()
const jsMatch = html.match(/src="(\/qhelper\/assets\/index-[^"]+\.js)"/)
if (!jsMatch) {
  console.log('js link not found')
} else {
  const js = await (await fetch(base + jsMatch[1])).text()
  console.log('JS has 读写自检:', js.includes('读写自检'))
  console.log('JS has 档案最后保存:', js.includes('档案最后保存'))
  console.log('JS has 存储不可用 error state:', js.includes('存储不可用'))
  console.log('JS has tabbar:', js.includes('tabbar-on'))
}
