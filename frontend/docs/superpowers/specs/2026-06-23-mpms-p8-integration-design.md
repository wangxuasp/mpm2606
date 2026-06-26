# Extech MPMS P8 集成预留 设计规格

> 文档编号：MBD-MES-P8-SPEC-01 | 日期：2026-06-23  
> 依据：总方案 §4.3 / P8 分期表 | 前置：P7 完成

## 1. 目标

ERP / MES / Teamcenter 接入点抽象；协同级后端交接数据包；整库 JSON 导出增强。

## 2. 范围

### 纳入
- `lib/integration/` — 三系统 Client 接口 + Mock 实现 + `integration-service`
- API 路由 `/api/integration/{erp,mes,teamcenter}/...` 占位
- `/integration` 页面：连接状态、投产推送、同步日志
- `handoff-package` — 按协同导出结构化交接包
- 设置页增强：协同数据包导出入口

### 不纳入
- 真实 ERP/MES/Teamcenter 联调
- 后端服务实现

## 3. 成功标准

- [ ] 三系统 Mock 推送/同步可触发并记录日志
- [ ] 投产推送校验 MBOM/BOP 受控状态
- [ ] 协同交接数据包可导出 JSON
- [ ] `pnpm build` 通过
