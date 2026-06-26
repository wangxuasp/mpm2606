# Extech MPMS P4 资源与文件设计规格

> 文档编号：MBD-MES-P4-SPEC-01 | 日期：2026-06-23  
> 依据：总方案 §3.8–3.10 | 前置：P3 完成

## 1. 目标

**资源/文件闭环**：工艺资源库管理、工艺文件上传与归集、APD Excel 导出。

## 2. 范围

### 纳入
- 资源库：分类列表、搜索、新增、入库/退库（`inLibrary` 状态）、Excel 批量导入
- 工艺文件：WD 编号、上传 Blob、关联工序/BOP、按产品归集、OnlyOffice 占位预览
- APD 导出：基于 BOP+MBOM+工序生成 Excel 工作簿
- 工装管理页：工装类资源视图（`kind=tooling`）

### 不纳入（→ P5）
- XState 完整审批流
- OnlyOffice 真实服务
- PDF 输出

## 3. 成功标准

- [ ] 资源库可增删改查、入库/退库切换
- [ ] Excel 导入资源
- [ ] 工艺文件可上传并在列表展示
- [ ] APD Excel 可下载
- [ ] `pnpm build` 通过
