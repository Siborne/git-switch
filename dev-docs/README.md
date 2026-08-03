# dev-docs —— 开发文档

本目录存放与 AI 协作讨论产生的开发文档,与 GitHub Pages 落地页目录(`docs/`)彻底分离,**不会部署到公开网页**。

## 目录结构

| 目录 | 用途 | 命名建议 |
|---|---|---|
| [`prd/`](prd/) | 产品需求文档(PRD) | `PRD-<功能名>.md` 或沿用 `PRD.md` |
| [`tech/`](tech/) | 技术方案 / 架构决策 / 调研笔记 | `<主题>.md`,如 `includeIf-同步方案.md` |
| [`bugs/`](bugs/) | Bug 记录与排查过程 | `BUG-<简述>.md`,如 `BUG-applyGlobal-备份失效.md` |
| [`changelog/`](changelog/) | 修改日志(按版本或日期) | `CHANGELOG-<version>.md` 或 `2026-08-03.md` |

## 协作约定

- 与 AI 讨论新需求 → 先在 `prd/` 产出 PRD,评审通过后再进入开发
- 技术难点 / 方案选型 → 在 `tech/` 沉淀,便于后续追溯
- 线上/测试发现的缺陷 → 在 `bugs/` 记录复现步骤、根因、修复方案
- 每次代码改动 → 在 `changelog/` 追加修改日志
