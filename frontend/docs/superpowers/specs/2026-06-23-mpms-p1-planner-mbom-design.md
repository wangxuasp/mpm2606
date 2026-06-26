# Extech MPMS P1 规划器与 MBOM 重构设计规格

> 文档编号：MBD-MES-P1-SPEC-01  
> 版本：V1.0  
> 日期：2026-06-23  
> 依据：总方案 §3.1–3.3、P0 规格  
> 前置：P0 基座已完成

## 1. 目标

实现 **EBOM→MBOM 可搭建** 核心闭环：多面板规划器、AG Grid 树、协同关联绑定 MBOM 根、拖拽引用、虚拟件/虚拟组、批量属性编辑、责信度检查、外购件下级约束校验。

## 2. 范围

### 纳入 P1
- AG Grid Community 树形表格（EBOM/MBOM）
- `allotment` 多面板规划器（EBOM | MBOM | 属性）
- 协同关联：初始化 MBOM 根并绑定 `collaboration.mbomRootId`
- EBOM→MBOM 拖拽引用（记录 `sourceEbomNodeId`）
- 新建半成品虚拟件（图号含 BC）、虚拟组
- MBOM 层级调整（行内 reparent）
- MBOM 独立页：网格 + 工具栏 + 批量属性侧栏
- 责信度检查（四类结果）
- Zod 外购件下级约束校验

### 不纳入 P1（→ P2+）
- 工艺路线 BOP 面板、React Flow
- 三维 JT 面板
- 工艺卡 OnlyOffice
- 审批发布流程

## 3. 技术决策

| 项 | 选择 |
| --- | --- |
| 表格 | `ag-grid-community` + `ag-grid-react` |
| 多面板 | `allotment` |
| 拖拽 | AG Grid 行拖拽 + `dataTransfer` 跨面板 |
| 溯源 | MBOM 节点新增可选字段 `sourceEbomNodeId?: string` |

## 4. 成功标准

- [ ] 规划器三栏可拖拽调整宽度
- [ ] 点击「初始化 MBOM」创建根节点并更新协同关联
- [ ] 从 EBOM 拖入 MBOM 创建引用节点
- [ ] 可新建 BC 虚拟件、虚拟组
- [ ] MBOM 页批量编辑 makeType/定额等属性
- [ ] 责信度检查展示四类结果
- [ ] 外购件下挂自制件时保存被阻断并提示
- [ ] `pnpm build` 通过
