/**
 * 关于页 —— spec §2.5 署名 + §2.7 隐私基线（写入关于页承诺）。
 */
export function AboutPage() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>关于 QHelper</h1>
      </header>

      <section className="card" aria-label="应用信息">
        <p className="card-label">QHelper 智能减脂助手 · MVP</p>
        <p className="card-hint">
          个人减脂记录工具：规则计算每日热量预算，把「吃进去的」和「体重的变化」记成可看的趋势。
          网页（PWA）先行，可安装到主屏，完全离线可用。
        </p>
      </section>

      <section className="card" aria-label="隐私说明">
        <p className="card-label">隐私说明</p>
        <ul className="about-list">
          <li>所有数据（档案、记录、食物库）**仅存本机**浏览器存储，不上传任何服务器。</li>
          <li>无账号、无追踪、无第三方统计 SDK。</li>
          <li>数据备份靠「设置 → 导出 JSON」，换设备/清缓存前请先导出。</li>
          <li>未来的 AI 教练功能（v2.0）若启用，仅在你主动发起对话时发送明确列出的档案摘要，API Key 由你自持。</li>
        </ul>
      </section>

      <section className="card" aria-label="数据来源署名">
        <p className="card-label">食物数据来源与许可</p>
        <ul className="about-list">
          <li>
            <b>台湾卫福部食药署「食品营养成分资料库」</b>
            （政府资料开放授权条款第 1 版——允许重制/改作，需注明出处）——基础食材数值参照。
          </li>
          <li>
            <b>USDA FoodData Central SR Legacy</b>（CC0 公有领域）——补缺校验。
          </li>
          <li>
            <b>家常菜肴 / 外卖</b>条目为本应用整理的<b>估算值</b>（列表中标注「估算」），仅供参考。
          </li>
          <li>每年核对一次台湾库新版。</li>
        </ul>
      </section>

      <section className="card" aria-label="计算依据">
        <p className="card-label">计算依据</p>
        <ul className="about-list">
          <li>BMR：Mifflin-St Jeor 公式</li>
          <li>TDEE = BMR × 活动系数（久坐 1.2 / 轻度 1.375 / 中度 1.55 / 高 1.725）</li>
          <li>缺口 = 每周速率 × 1100 kcal（1 kg 体脂 ≈ 7700 kcal）</li>
          <li>安全下限：女 1200 / 男 1500 kcal（触及拒绝保存）；低于 BMR 黄色警告</li>
          <li>本工具不构成医疗建议；极端节食请咨询专业营养师/医生</li>
        </ul>
      </section>
    </main>
  )
}
