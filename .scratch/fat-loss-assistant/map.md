# Map: 跨平台智能减脂助手 — 规划图

Labels: wayfinder:map
Status: complete

## Destination

一份完整的产品 + 技术规格书（spec），写成 AI 可代为执行、人类可验收的形态：涵盖 MVP（热量/饮食记录、全套身体数据、目标设定与计划）的功能规格、技术选型、数据模型、隐私与数据安全一节，以及以「AI 教练对话 + 趋势报表」为主的后续版本路线图。目标节奏 1–3 个月内产出可日常使用的版本。

## Notes

- 域：个人健康管理 / 减脂记录工具。
- **开发方式（关键约束）**：用户无编程经验，由 AI 代写代码、用户负责验收和决策。规格书必须写成 AI 可执行形态（明确的验收标准、小步可验的里程碑）。
- 平台：网页先行，其次 iOS/Android，桌面端后置；一套代码跨端优先。
- 界面中文；度量 kg / kcal（斤仅做显示换算）。
- 数据：MVP 纯本地存储，无后端；云同步留作后续决策。
- 食物数据：内置常见中式食物热量库 + 自定义食物，不依赖网络。
- 商业形态：个人自用/小范围，不做账号与支付，但健康数据隐私在规格中留一节。
- 后续智能功能用户愿意支付少量订阅（如 LLM API 费用）。
- 技能：决策类票面调用 /grilling + /domain-modeling；研究类票面调用 /research；原型票面调用 /prototype。
- 会话规则：每会话最多推进一张票（research 票除外）。

## Tickets

<!-- 本 tracker（本地 markdown）不支持原生依赖边，按 tracker 文档回退为 Blocked by 行 + 此清单索引 -->

- [x] [01-跨平台框架选型](issues/01-research-framework.md) — research
- [x] [02-中文食物热量数据库来源](issues/02-research-food-db.md) — research
- [x] [03-LLM 教练的成本与接入方式](issues/03-research-llm.md) — research
- [x] [04-MVP 数据模型与记录流程](issues/04-grilling-data-model.md) — grilling
- [x] [05-热量预算与安全规则](issues/05-grilling-calorie-rules.md) — grilling
- [x] [06-网页端核心记录流程原型](issues/06-prototype-core-flow.md) — prototype
- [x] [07-汇总撰写规格书 v1](issues/07-task-spec-assembly.md) — task

## Decisions so far

- [01-跨平台框架选型](issues/01-research-framework.md) — 选定 Vite + React PWA + Dexie/IndexedDB，后续 Capacitor 打包移动端并迁原生 SQLite；须一开始就做存储抽象层（Repo 接口）。备选 Expo（若移动端为主战场）。详见 [research/01-framework.md](research/01-framework.md)。
- [03-LLM 教练的成本与接入方式](issues/03-research-llm.md) — 主力 GLM-5.3-Flash（≈¥1/月，免费 GLM-4.7-Flash 兜底），成本不是瓶颈；MVP 用 BYOK（key 存 Keychain/Keystore，严禁硬编码），二期可加代理。详见 [research/03-llm.md](research/03-llm.md)。
- [02-中文食物热量数据库来源](issues/02-research-food-db.md) — 台湾食药署开放资料库（开放授权条款）为主 + USDA SR Legacy（CC0）补缺，清洗为 300~800 条简体精选库内置 <200KB；《中国食物成分表》有判例不可内置，香港 NIIS 不可商用。详见 [research/02-food-db.md](research/02-food-db.md)。
- [04-MVP 数据模型与记录流程](issues/04-grilling-data-model.md) — 六实体模型（档案/目标版本/餐槽→食物条目快照/统一测量表/食物库/Repo 抽象层）；体重每日可选、四餐槽多条目、克数真值+份型快捷、任意补录、目标=体重+速率自动推日期、同日多次取均值、达成后维持模式。术语已入 [CONTEXT.md](../../../CONTEXT.md)。
- [05-热量预算与安全规则](issues/05-grilling-calorie-rules.md) — 计算链定型：Mifflin-St Jeor → 四档活动系数 → 缺口=速率×1100（1kg≈7700kcal）→ 预算固定不自动调；速率上限 1kg/周、硬下限女1200/男1500、黄警=低于 BMR 可继续；平台期三色状态只提示不调账。术语已入 CONTEXT.md。
- [06-网页端核心记录流程原型](issues/06-prototype-core-flow.md) — C「时间线·手账风」胜出为界面基线；5 条设计结论：本餐会话制录食、记录入口常驻可见、多次打卡不拦截+日均值口径可见、目标编辑统一弹窗（红拦/黄警/绿过实时预览）、一日一页时间线架构。原型资产留存 [prototype/](prototype/core-flow-prototype.html)。
- [07-汇总撰写规格书 v1](issues/07-task-spec-assembly.md) — 规格书完成：[spec.md](spec.md)（10 章节：MVP 功能规格带验收标准、技术选型与 Repo 铁律、六实体数据模型、交互基线、DoD 十项、路线图 v1.5/v2.0、里程碑 M0–M4）。**目的地达成，01–07 全部 resolved。**

## 当前状态（2026-02 · map 完结）

- **目的地已达成**：规格书 v1 完成于 [spec.md](spec.md)；01–07 全部 resolved（3 research + 2 grilling + 1 prototype + 1 task）。
- 下一步不在本 map 内：按 spec.md §9 里程碑启动实现（M0 工程骨架起步），实现工作建议走常规 issue 流程或新 effort，不再挂在本规划图下。
- 雾区（v1.5 报表设计、v2.0 教练 prompt 设计）已在规格书中标注「实现前补一次 grilling」。
- 域术语表沉淀于仓库根 [CONTEXT.md](../../../CONTEXT.md)（21 个术语）。

## Not yet specified

- 云同步 / 多设备：MVP 纯本地，网页先行落地后「手机端与网页端数据如何互通」才会变得可定义。
- 趋势报表的具体设计：依赖 MVP 落地后的真实数据形态（记录频率、数据完整性）。
- AI 教练对话的交互与提示词设计：依赖 03 号票的研究结论（成本、可用 API）与 MVP 数据模型。

## Out of scope

- 拍照识别食物（用户未选入路线图优先级；如日后重绘目的地可另启 effort）。
- 动态热量预算自动调整（同上，用户未选）。
- 账号体系、支付、商业化（个人自用/小范围定位）。
