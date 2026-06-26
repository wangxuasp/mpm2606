# Extech MPMS P0

Extech MPMS（制造工艺管理系统）V11.0 P0 基座 — 基于 Next.js App Router 的可运行空壳，包含 IndexedDB 演示数据、Mock 认证、工作台概览、只读 EBOM 规划器与 JSON 数据管理。

## 技术栈

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- Dexie.js (IndexedDB) + TanStack Query
- Zustand + Zod + React Hook Form

## 快速开始

```bash
pnpm install
pnpm dev
```

浏览器访问 [http://localhost:3000](http://localhost:3000)。

生产构建：

```bash
pnpm build
pnpm start
```

## 登录

- 用户名：`admin`
- 密码：`admin`

## P0 功能清单

- [x] Mock 登录与会话（localStorage）
- [x] 工作台侧栏 12 个模块入口 + 设置 + 系统管理
- [x] 工作台首页概览卡片（EBOM / 协同 / 字典 / 版本）
- [x] 制造工艺规划器 — 只读 EBOM 树 + 节点属性面板
- [x] 设置页 — JSON 导出 / 导入 / 重置种子 / 表记录数
- [x] 字典管理 — 只读 50 条字典（Tabs 筛选）
- [x] API：`GET /api/health`、`GET /api/3d/jt?nodeId=xxx`
- [x] IndexedDB 种子数据持久化（刷新后数据仍在）

## 规格文档

- 设计规格：[docs/superpowers/specs/2026-06-23-mpms-p0-foundation-design.md](docs/superpowers/specs/2026-06-23-mpms-p0-foundation-design.md)
- 实施计划：[docs/superpowers/plans/2026-06-23-mpms-p0-foundation.md](docs/superpowers/plans/2026-06-23-mpms-p0-foundation.md)

## 版权

北京艾克斯科技有限公司 · Extech MPMS V11.0
