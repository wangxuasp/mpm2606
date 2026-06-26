# Extech MPMS P7 AI Copilot 设计规格

> 文档编号：MBD-MES-P7-SPEC-01 | 日期：2026-06-23  
> 依据：总方案 §3.16 | 前置：P6 完成

## 1. 目标

工艺 AI Copilot：5 场景 Mock + `llm.invoke()` 接入点 + 历史 APD Excel 结构化导入预览与批量写入。

## 2. 范围

### 纳入
- `lib/ai/llm-client.ts` — `invoke(prompt, context?)` Mock
- 5 场景处理器（合规审查、BOM 转换、智能编辑、历史导入、知识助手）
- `/copilot` 命令面板式 UI + 对话历史
- 历史导入：Excel 上传 → 预览表 → 勾选 → 写入 BOP/工序/资源
- 向量库/图库占位说明

### 不纳入（→ P8）
- 真实 LLM API
- ERP/MES/Teamcenter 集成

## 3. 成功标准

- [ ] 5 场景均可触发并返回 Mock 结果
- [ ] 历史 APD Excel 可预览并批量创建对象
- [ ] `llm.invoke` 接入点文档化于代码
- [ ] `pnpm build` 通过
