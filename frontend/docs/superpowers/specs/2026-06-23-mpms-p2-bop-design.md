# Extech MPMS P2 工艺路线（BOP）设计规格

> 文档编号：MBD-MES-P2-SPEC-01 | 日期：2026-06-23  
> 依据：总方案 §3.4 | 前置：P1 完成

## 1. 目标

交付 **BOP 可规划**：工艺路线树（三层/二层）、React Flow PERT/DAG、协作信封、版本只读。

## 2. 范围

### 纳入
- `bop-service`：初始化 BOP 根、创建 machine/stage/operation 节点（AS 编号）
- AG Grid BOP 树 + 属性面板
- React Flow PERT/DAG（无环校验、连线持久化到 `pertDag`）
- 信封收件箱/发件箱（IndexedDB，筛选）
- `lifecycleState === 'released'` 时只读
- 规划器增加 BOP 树面板（第四栏）
- 协同关联绑定 `bopRootId`

### 不纳入（→ P3）
- Operation 实体详情编制、工艺卡
- 审批流、权限分配 UI

## 3. 成功标准

- [ ] 初始化 BOP（整机三层 / 模块二层可选）
- [ ] 树内增删改节点层级合法
- [ ] PERT 连线保存，成环时拒绝
- [ ] 信封可发/收/筛选
- [ ] 受控节点不可编辑
- [ ] `pnpm build` 通过
