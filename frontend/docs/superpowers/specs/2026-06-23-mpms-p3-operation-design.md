# Extech MPMS P3 工序编制设计规格

> 文档编号：MBD-MES-P3-SPEC-01 | 日期：2026-06-23  
> 依据：总方案 §3.5–3.7（工序/定额/关重件 subset）

## 1. 目标

**工序可编制**：BOP 叶子关联 Operation 实体、MBOM 物料指派、工艺卡占位、检验/专业组别、责信度检查、截图工具、Excel 导出。

## 2. 范围

### 纳入
- `operation-service`：与 BOP 工序节点 1:1 同步（OP 编号）
- 工序编制页：选工序 → 属性/资源/工艺卡/质控
- MBOM 拖入指派消耗物料（MEConsumed）
- 资源库种子 + 搜索指派（MEResource/METool）
- `OnlyOfficeEditor` 占位 + 结构化工艺卡表单降级
- 自检/专检、专业组别、关键工序、工时/人数定额
- 工序级责信度检查
- 截图工具（getDisplayMedia + 简易标注）
- exceljs 工艺卡导出

### 不纳入（→ P4+）
- OnlyOffice 真实服务
- 完整 APD Excel 模板导入解析
- 资源库入库流程

## 3. 成功标准

- [ ] 创建 BOP 工序节点自动建 Operation（OP 编号）
- [ ] MBOM 拖入绑定 consumedItems
- [ ] 工艺卡表头自动填 MBOM 根图号
- [ ] 工序检查显示责信度结果
- [ ] 截图可捕获并下载
- [ ] Excel 导出可下载
- [ ] `pnpm build` 通过
