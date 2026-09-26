# 03 - LLM 教练的成本与接入方式

Labels: wayfinder:research
Type: research
Status: resolved

## Question

路线图首位智能功能是「AI 教练对话」（解答、鼓励、食谱建议），用户可接受少量订阅费。MVP 之后的版本应如何接入？

需要回答：

1. 主流可用的 LLM API 选项（OpenAI、Anthropic、DeepSeek、GLM 等）及大致定价——按「每天 10～20 轮对话」的用量估算月成本。
2. 纯本地 App（无自建后端）直接从客户端调用 LLM API 的可行性与安全考虑（API key 放客户端的风险、是否有适合个人的代理方案）。
3. 减脂场景是否有现成的开源 prompt/agent 方案可借鉴。
4. 给出推荐：哪个 API + key 管理方式 + 预估月成本。

## Blocked by

（无 —— 前沿票）

## Answer

**推荐：智谱 GLM-5.3-Flash 为主力模型（≈¥1/月），免费 GLM-4.7-Flash 兜底；MVP 用 BYOK（用户自填 API key，存系统安全存储），二期再加轻量代理。**

- 成本：按 15 轮/天、1.5K+300 token/轮估算，月成本 GLM-5.3-Flash ≈¥1、DeepSeek ≈¥1.3–2.6、gpt-5-mini ≈¥3、Haiku 4.5 ≈¥10。**成本不是选型瓶颈**，重点应放在教练 prompt 质量、食物数据库与医疗免责设计。
- 选型理由：GLM 国内直连、人民币计费、OpenAI 兼容接口、1M 上下文、支持视觉输入（为将来拍照识别留口）；DeepSeek 作备选（注意工作日高峰时段双倍价）；OpenAI/Anthropic 需海外支付，只作可选高级引擎。
- Key 管理：严禁把开发者 key 硬编码进安装包（OWASP MASWE-0005 + Android 官方指南均列为风险）。MVP 设置页 BYOK，key 存 iOS Keychain / Android Keystore，不明文落盘、不进备份；配注册→建 key→充值引导教程。二期可选 Cloudflare Worker 代理（开源参考 backmesh）做「免配置」模式。
- 可借鉴开源：H1an1/health-coach（600+ 中文食物库 + 提示词组织，最贴合）、Nutrition-Buddy（现成营养师 system prompt）；GitHub 细节使用前需复核 license 与实现。

完整报告（定价对比表、月成本估算、key 方案对比、来源清单）：[research/03-llm.md](../research/03-llm.md)
