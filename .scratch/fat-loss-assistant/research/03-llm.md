# 减脂助手 App「AI 教练对话」LLM 选型研究

> 查询日期：2026-09-26。所有定价均以官方定价页为准（无法访问官方页时已注明，并用多个第三方交叉验证）。
> 用量假设：每天 10～20 轮对话（按 15 轮/天估算），每轮上下文约 1～2K token（按 1.5K 输入 / 300 输出估算）。

## TL;DR

- **该用量极其便宜**：每月约 45 万输入 token + 13.5 万输出 token，即使全部按峰值价算，最贵的 Claude Haiku 4.5 也只有 **约 ¥10/月**，GLM-4.7-Flash 甚至 **免费**。
- **推荐主方案：智谱 GLM-4.7-Flash（免费）/ GLM-5.3-Flash（¥0.8/M 输入、¥2.8/M 输出）**，国内直连、人民币计费、无需海外支付渠道。
- **Key 管理**：MVP 纯本地 App 不要把开发者的 key 硬编码进安装包（OWASP 明确列为移动安全风险 MASWE-0005）；采用 **用户自己填 key（BYOK）+ 操作系统安全存储（iOS Keychain / Android Keystore）**。
- 后续若要做成"开箱即用"的产品，再加一层轻量代理（Cloudflare Worker / 云函数）持有 key，月成本在个位数人民币，可被订阅费覆盖。

---

## 1. 主流 LLM API 定价对比与月成本估算

### 1.1 各家官方定价

| 提供商 / 模型 | 输入（/1M token） | 输出（/1M token） | 备注 | 来源 |
|---|---|---|---|---|
| **智谱 GLM-4.7-Flash** | **免费** | **免费** | 200K 上下文，官方价格表标注"免费" | [智谱 API 定价](https://docs.bigmodel.cn/cn/guide/start/pricing)（2026-09-26） |
| **智谱 GLM-5.3-Flash** | ¥0.8（缓存命中 ¥0.23） | ¥2.8 | 1M 上下文，多模态输入 | 同上 |
| **智谱 GLM-5.3（旗舰）** | ¥8 | ¥28 | 1M 上下文 | 同上 |
| **DeepSeek deepseek-flash**（V4.1-Flash） | 峰值 $0.30 / 非峰值 $0.15（缓存未命中）；缓存命中 $0.006~0.003 | 峰值 $1.20 / 非峰值 $0.60 | 非峰值为大部分时段（工作日 01-04、06-10 UTC 之外均是非峰值）；支持视觉 | [DeepSeek Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing)（2026-09-26） |
| **OpenAI gpt-5-mini** | $0.25（缓存读 $0.03） | $2.00 | 400K 上下文；openai.com 官方页被 Cloudflare 拦截未能直接抓取，价格与 OpenAI 官方发布文一致，多个第三方目录交叉印证 | [OpenAI GPT-5 发布文](https://openai.com/index/introducing-gpt-5-for-developers/)（官方，未能直接访问）；[WaveSpeed 模型页](https://wavespeed.ai/llm/openai/gpt-5-mini)、[FutureAGI 计算器](https://futureagi.com/llm-cost-calculator/openai/gpt-5-mini/)（2026-09-26） |
| **OpenAI gpt-4o-mini** | $0.15 | $0.60 | 官方模型页 [developers.openai.com](https://developers.openai.com/api/docs/models/gpt-4o-mini) 同样被拦截；该价格为此前官方公布并被广泛引用的数字，使用前请自行核对 | 同上（2026-09-26） |
| **Anthropic Claude Haiku 4.5** | $1 | $5 | 官方称配合 prompt caching 最高省 90%、批处理省 50% | [Anthropic Claude Haiku 官方页](https://www.anthropic.com/claude/haiku)（2026-09-26） |
| 其他国内低价方案 | — | — | 智谱自家就有免费档（GLM-4.7-Flash / GLM-4-Flash / GLM-Z1-Flash）和 ¥0.1/M 的 GLM-4-FlashX-250414；DeepSeek 对中国用户以人民币结算，汇率按 1 USD ≈ ¥7.1 折算 | [智谱 API 定价](https://docs.bigmodel.cn/cn/guide/start/pricing) |

> 说明：DeepSeek 页面以美元计价；其官方人民币价格请在充值页确认。智谱直接以人民币计价，对国内个人开发者最省事。

### 1.2 按目标用量估算月成本

用量估算：15 轮/天 × 30 天 = **450 轮/月**；每轮按 1.5K 输入 + 300 输出 token 计：

- 月输入 ≈ 450 × 1,500 = **67.5 万 token（0.675M）**
- 月输出 ≈ 450 × 300 = **13.5 万 token（0.135M）**

| 模型 | 计算 | 月成本 | 折合人民币（1:7.1） |
|---|---|---|---|
| GLM-4.7-Flash | 免费 | **$0** | **¥0** |
| GLM-5.3-Flash | 0.675×0.8 + 0.135×2.8 ≈ ¥0.92 | **≈ ¥1** | ≈ ¥1 |
| DeepSeek-flash（非峰值） | 0.675×$0.15 + 0.135×$0.6 ≈ $0.18 | ≈ $0.18 | ≈ ¥1.3（峰值价约 ¥2.6） |
| gpt-5-mini | 0.675×$0.25 + 0.135×$2 ≈ $0.44 | ≈ $0.44 | ≈ ¥3.1 |
| Claude Haiku 4.5 | 0.675×$1 + 0.135×$5 ≈ $1.35 | ≈ $1.35 | ≈ ¥9.6 |

即便按"重度使用 20 轮/天、上下文 2K、输出 500"再翻一倍，最贵的 Haiku 也不超过 ¥25/月——远低于用户可接受的"几十元"订阅档。**结论：成本不是选型瓶颈，稳定性、中文质量与接入便利才是。**

---

## 2. 纯本地 App 直接调 LLM API 的可行性与 Key 安全

### 2.1 直接调 API 可行，但 key 不能打包进 App

技术上，纯本地 App 从客户端直连 LLM API 完全可行——这些 API 都是标准 HTTPS REST（OpenAI 兼容格式），无需后端。

风险在于 **key 的存放位置**：

- **硬编码进安装包 = 公开泄露**。APK/IPA 可被反编译提取字符串。OWASP MAS 把"应用包中硬编码 API 密钥"列为移动安全风险条目 [MASWE-0005](https://mas.owasp.ac.cn/MASWE/MASVS-AUTH/MASWE-0005/)（2026-09-26），其缓解措施明确要求不要在客户端内嵌密钥；Google Android 官方安全指南同样警告在客户端不安全地使用 API key 会被第三方盗用并产生费用（[Android Developers: 不安全的 API 使用方式](https://developer.android.google.cn/privacy-and-security/risks/insecure-api-usage?hl=zh-cn)）。
- 任何"把开发者的 key 混淆/加密后放进客户端"的方案都属于混淆而非防护，破解成本极低。

### 2.2 个人开发者的常见处理方式

1. **用户自带 key（BYOK）—— MVP 首选**
   - 用户在 App 设置里粘贴自己的 API key；App 用 **iOS Keychain / Android Keystore（加密存储）** 保存，不落明文、不进备份。
   - 优点：零后端、零成本、无泄露面（key 只在用户自己设备上）；费用天然由用户自担，与"个人使用 + 少量订阅"模式兼容（甚至可以只卖 App/订阅、API 费用用户自付）。
   - 缺点：用户需要去智谱/DeepSeek 注册并充值，有上手门槛。
2. **轻量代理 / 云函数持有 key**
   - 用 Cloudflare Workers、Vercel Edge Functions、腾讯云函数等部署一个几十行的转发服务：客户端带用户标识请求代理，代理注入服务端 key 再转发给 LLM。
   - 开源方案如 [backmesh](https://github.com/backmesh/backmesh) 就是专门"保护 App 内 LLM key"的开源代理后端（检索于 2026-09-26）。
   - 优点：开箱即用、可做用量限额/计费；缺点：引入了一个需运维的后端组件（与 MVP"纯本地"矛盾），且 key 在服务端仍需防盗刷（加签名/限额）。
   - 本项目用量极小（¥1～3/月），云函数免费额度基本可以覆盖，是后续商业化的自然路径。
3. **混合（推荐演进路线）**：MVP 阶段 BYOK；用户量起来后加"官方托管模式"（代理 + 订阅），同时保留 BYOK 作为低价选项。

---

## 3. 健康/减脂场景的开源 Prompt 与方案

以下为 GitHub/HF 上可借鉴的开源项目（均检索于 2026-09-26；GitHub 在本次研究环境无法直接抓取页面内容，仓库描述以搜索结果摘要为准，使用前请复核 license 与实现细节）：

| 项目 | 内容 | 借鉴点 |
|---|---|---|
| [H1an1/health-coach](https://github.com/h1an1/health-coach) | 开源 AI 健康教练 skill：餐食照片分析、体检报告解读、身体数据追踪、训练计划，内置 600+ 中文食物营养数据库 | **最贴合本项目**：中文食物数据库 + 系统提示词组织方式可直接参考 |
| [ib-hussain/Multi-Agentic_Health_Assistant](https://github.com/ib-hussain/Multi-Agentic_Health_Assistant) | 多智能体健康平台：饮食记录视觉分析、个性化训练计划、心理支持，基于 DeepSeek/LangChain | 多 agent 分工（营养/训练/激励）的结构设计 |
| [mindstreamAI/pohudey-AI-bot](https://github.com/mindstreamAI/pohudey-AI-bot) | 基于 LangChain 的 Telegram 减肥机器人：追踪饮食、体重，生成个性化减脂计划 | 减脂场景的对话流程与记忆管理 |
| [Tonic/open-gpt-Nutrition-Buddy](https://huggingface.co/spaces/Tonic/open-gpt-Nutrition-Buddy) | HF Spaces 上的营养助手，含完整系统提示词（[app.py](https://huggingface.co/spaces/Tonic/open-gpt-Nutrition-Buddy/blame/9373bcb74835b3b15d99fa03cc57c25a952646e9/app.py)） | 现成可抄的营养师 system prompt |
| [DrishtiSharma/multiagent-wellbeing-coach](https://huggingface.co/spaces/DrishtiSharma/multiagent-wellbeing-coach/blob/5fb305a69e2b207b152ff82b70c7d8129dd455ab/app.py) | 多智能体身心健康教练 | 提示词分层（角色/约束/安全免责声明）写法 |
| 学术参考 | 聊天机器人减脂干预的行为策略研究（[JMIR Formative, 2025](https://formative.jmir.org/2025/1/e75421/PDF)） | "鼓励/克服即时满足偏差"等策略可写进教练 prompt |

**共性可借鉴要点**：① 系统提示词需含角色设定（注册营养师/教练语气）、硬约束（不做医疗诊断、极端节食建议要拒绝并建议就医）；② 把用户档案（身高体重目标、饮食偏好）作为持久上下文注入；③ 输出尽量结构化（食谱给克数与热量估算），便于 App 渲染。

---

## 4. 推荐方案与月成本估算

### 推荐选型

| 项 | 推荐 | 理由 |
|---|---|---|
| **主力模型** | **智谱 GLM-5.3-Flash**（兜底备选：免费的 GLM-4.7-Flash） | 官方价格 ¥0.8/M 输入、¥2.8/M 输出（[定价页](https://docs.bigmodel.cn/cn/guide/start/pricing)，2026-09-26）；1M 上下文、支持视觉（可拍照识别食物）；国内直连、人民币充值、OpenAI 兼容接口 |
| **备选** | DeepSeek-flash（≈¥1.3~2.6/月） | 中文质量口碑好、非峰值半价；注意其高峰时段（工作日 01-04、06-10 UTC）提价一倍（[定价页](https://api-docs.deepseek.com/quick_start/pricing)） |
| **不推荐为默认** | gpt-5-mini（≈¥3/月）、Claude Haiku 4.5（≈¥10/月） | 成本仍可承受，但需海外支付、网络可达性差，作为可选"高级引擎"即可 |

### Key 管理方案

1. **MVP：BYOK**。设置页让用户粘贴智谱 API key → 存入 **Keychain/Keystore**（绝不明文落盘、不进 iCloud/备份）；App 内直连 `https://open.bigmodel.cn/api/paas/v4` 的 OpenAI 兼容接口。附引导教程（注册→实名→建 key→充值 10 元可用很久）。
2. **不硬编码任何开发者 key**（依据 [OWASP MASWE-0005](https://mas.owasp.ac.cn/MASWE/MASVS-AUTH/MASWE-0005/)）。
3. **二期（可选）**：部署一个 Cloudflare Worker 代理持有平台 key，提供"免配置"模式并限额；开源参考 [backmesh](https://github.com/backmesh/backmesh)。

### 月成本估算（15 轮/天，1.5K 输入 + 300 输出 token/轮）

| 方案 | 月成本 |
|---|---|
| GLM-4.7-Flash | **¥0** |
| **GLM-5.3-Flash（推荐）** | **≈ ¥1/月**（重度用量翻倍也仅 ≈ ¥2） |
| DeepSeek-flash | ≈ ¥1.3 ~ 2.6/月 |
| gpt-5-mini | ≈ ¥3/月 |
| Claude Haiku 4.5 | ≈ ¥10/月 |

**结论：LLM 调用成本对订阅定价几乎无压力（<¥3/月），主要工作应放在教练 prompt 质量、食物数据库与安全免责设计上。**
