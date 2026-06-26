# Extech MPMS P6 三维与汇总设计规格

> 文档编号：MBD-MES-P6-SPEC-01 | 日期：2026-06-23  
> 依据：总方案 §3.14–3.15 | 前置：P5 完成

## 1. 目标

工艺汇总清单（多表 + Excel）+ JT 下载入口（按 BOM/工序、任务队列）。

## 2. 范围

### 纳入
- `process-summary-service`：装入件、设备工具、工装、材料/工时/人员定额聚合
- `/summary` 多 Tab 清单 + 导出 Excel
- `jt-download-service`：调用 `/api/3d/jt`，任务队列状态
- 规划器 JT 面板（选中 BOM/工序显示 JT 清单与下载）
- 种子 EBOM 节点补充 `jtModelRef` 演示字段

### 不纳入（→ P7）
- Web 端 JT 渲染
- AI Copilot

## 3. 成功标准

- [ ] 汇总页 6 类清单有数据（有工序/MBOM 时）
- [ ] Excel 导出成功
- [ ] 规划器可选节点下载 JT（Mock API）
- [ ] 下载任务队列可见状态
- [ ] `pnpm build` 通过
