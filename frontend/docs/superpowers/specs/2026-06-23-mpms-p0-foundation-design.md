# Extech MPMS P0 基座设计规格

> 文档编号：MBD-MES-P0-SPEC-01  
> 版本：V1.0  
> 日期：2026-06-23  
> 依据：`自研工艺管理系统开发设计方案.md` V0.1（MBD-MES-DEV-01）  
> 系统名称：Extech MPMS 制造工艺管理系统 V11.0  
> 版权所有：北京艾克斯科技有限公司

---

## 1. 概述

### 1.1 目标

交付可 `pnpm dev` / `pnpm build && pnpm start` 运行的 **P0 基座空壳**，为 P1+ 业务模块提供统一技术地基。P0 采用**方案三**：完整领域骨架 + 演示种子数据。

### 1.2 已确认决策

| 决策项 | 选择 |
| --- | --- |
| 范围 | P0 基座（不含 P1+ 业务逻辑） |
| 部署 | 标准 Next.js 应用（`next start`，保留 API Route） |
| 后台壳层 | Fork [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) 改造 |
| 登录 | 最简 Mock：`admin` / `admin`，无角色区分 |
| 数据方案 | 方案三：完整 Dexie 表 + Repository 抽象 + EBOM 演示种子 |

### 1.3 成功标准

- [ ] `pnpm dev` 无报错，登录 `admin/admin` 进入系统
- [ ] 侧栏 12 个入口均可导航；字典管理页只读展示 50 条种子数据
- [ ] 制造工艺规划器页展示只读 EBOM 树（~20 节点），点击节点显示属性
- [ ] 刷新后字典数据与 EBOM 种子仍在（IndexedDB 持久化）
- [ ] 设置页可导出 JSON 数据包、可导入覆盖、可重置种子
- [ ] `GET /api/health` 返回 200
- [ ] `GET /api/3d/jt?nodeId=xxx` 返回 Mock 响应

### 1.4 P0 明确不做

- AG Grid 树、跨面板拖拽、MBOM 重构逻辑（→ P1）
- React Flow PERT/DAG、工艺卡编辑器（→ P2/P3）
- XState 审批流引擎（→ P5）
- RBAC 角色权限（admin 下仅占位页）
- OnlyOffice / LLM 真实接入
- 自动化测试（P1 起补 Vitest）

---

## 2. 技术架构

### 2.1 技术栈

| 包 | 版本策略 | 用途 |
| --- | --- | --- |
| Next.js | 最新稳定版，App Router | 框架 |
| React | 随 Next.js | UI |
| TypeScript | strict | 全量类型 |
| Tailwind CSS + shadcn/ui | 随模板 | 样式与组件 |
| satnaing/shadcn-admin | Fork 改造 | 布局/导航/主题 |
| Zustand | 最新稳定版 | 工作上下文（当前型号/协同关联） |
| Dexie.js | 最新稳定版 | IndexedDB ORM |
| Zod | 最新稳定版 | Schema 校验 |
| TanStack Query | 最新稳定版 | 数据查询与缓存 |
| React Hook Form | 最新稳定版 | 登录/设置表单 |
| lucide-react | 随模板 | 图标 |
| pnpm | — | 包管理 |

**P0 不引入**：AG Grid、React Flow、XState、exceljs、OnlyOffice SDK。

### 2.2 应用分层（P0 落地范围）

```
┌─────────────────────────────────────────────┐
│ 页面层   app/(auth) | app/(workspace) | admin │
├─────────────────────────────────────────────┤
│ 组件层   layout | planner | placeholders      │
├─────────────────────────────────────────────┤
│ 状态层   Zustand workspace-store            │
│          TanStack Query hooks               │
├─────────────────────────────────────────────┤
│ 领域层   lib/domain/types + schemas         │
├─────────────────────────────────────────────┤
│ 持久层   lib/db/repositories (Dexie)        │
├─────────────────────────────────────────────┤
│ API 层   app/api/health | app/api/3d/jt     │
└─────────────────────────────────────────────┘
```

### 2.3 路由结构

```
app/
  (auth)/
    login/page.tsx                 # Mock 登录
  (workspace)/
    layout.tsx                     # 侧栏 + 顶栏
    page.tsx                       # 工作台首页（概览卡片）
    planner/page.tsx               # ★ 只读 EBOM 树演示
    mbom/page.tsx                  # 占位
    bop/page.tsx                   # 占位
    operation/page.tsx             # 占位
    resource/page.tsx              # 占位
    document/page.tsx              # 占位
    tooling/page.tsx               # 占位
    change/page.tsx                # 占位
    approval/page.tsx              # 占位
    summary/page.tsx               # 占位
    copilot/page.tsx               # 占位
    settings/page.tsx              # JSON 导入/导出
  admin/
    page.tsx                       # 系统管理占位
    users/page.tsx                 # 占位
    dictionaries/page.tsx          # 占位（字典已在 IndexedDB，P0 只读展示可选）
    workflow-templates/page.tsx    # 占位
    permissions/page.tsx           # 占位
  api/
    health/route.ts
    3d/jt/route.ts
```

### 2.4 目录结构

```
components/
  ui/                              # shadcn（保留模板）
  layout/                          # 侧栏/顶栏/品牌改造
  planner/
    ebom-readonly-tree.tsx         # P0 只读 EBOM 树
    node-property-panel.tsx        # 节点属性展示
  placeholders/
    module-placeholder.tsx         # 通用「开发中」占位
lib/
  db/
    schema.ts                      # Dexie 数据库定义
    seed.ts                        # 种子初始化逻辑
    repositories/
      base.ts                      # Repository 接口
      bom-repository.ts
      collaboration-repository.ts
      dictionary-repository.ts
      app-meta-repository.ts
      index.ts                     # 统一导出
  domain/
    types/                         # 全量领域类型
      collaboration.ts
      bom.ts
      bop.ts
      operation.ts
      resource.ts
      process-document.ts
      change-order.ts
      approval.ts
      envelope.ts
      dictionary.ts
      app-meta.ts
    schemas/                       # 对应 Zod schemas
    id-generator.ts                # AS/OP/WD 流水码
  auth/
    mock-auth.ts                   # admin/admin 校验
    session.ts                     # localStorage session
  api/
    client.ts                      # 未来 API Client 抽象（P0 空壳）
  mock/
    seed-ebom.json                 # ~20 节点 EBOM 样例
    dictionaries.json              # 附件1/2 字典
stores/
  workspace-store.ts               # 当前协同关联/型号
hooks/
  use-bom-nodes.ts                 # TanStack Query 包装
  use-dictionaries.ts
  use-collaboration.ts
  use-app-meta.ts
```

### 2.5 侧栏导航（12 项）

| 序号 | 菜单名 | 路由 | P0 状态 |
| --- | --- | --- | --- |
| 1 | 制造工艺规划器 | `/planner` | 只读 EBOM 演示 |
| 2 | MBOM 重构 | `/mbom` | 占位 |
| 3 | 工艺路线 | `/bop` | 占位 |
| 4 | 工序编制 | `/operation` | 占位 |
| 5 | 工艺资源库 | `/resource` | 占位 |
| 6 | 工艺文件 | `/document` | 占位 |
| 7 | 工装管理 | `/tooling` | 占位 |
| 8 | 工艺更改 | `/change` | 占位 |
| 9 | 工艺审批 | `/approval` | 占位 |
| 10 | 工艺汇总 | `/summary` | 占位 |
| 11 | AI Copilot | `/copilot` | 占位 |
| 12 | 系统管理 | `/admin` | 子页占位；字典管理为只读列表 |

---

## 3. 数据层设计

### 3.1 Dexie 表

| 表名 | 实体 | P0 数据量 |
| --- | --- | --- |
| `collaborationLinks` | CollaborationLink | 1（空关联，仅绑定 EBOM 根） |
| `bomNodes` | BomNode | ~20（EBOM 种子） |
| `bopNodes` | BopNode | 0 |
| `operations` | Operation | 0 |
| `resources` | Resource | 0 |
| `processDocuments` | ProcessDocument | 0 |
| `changeOrders` | ChangeOrder | 0 |
| `approvalRecords` | ApprovalRecord | 0 |
| `envelopes` | Envelope | 0 |
| `dictionaries` | DictionaryEntry | 50 |
| `appMeta` | AppMeta | 1 |

### 3.2 核心领域类型（摘要）

与 `自研工艺管理系统开发设计方案.md` §4.2 保持一致，P0 全量定义 TypeScript 类型与 Zod schema，业务表可为空。

```ts
// 协同关联
CollaborationLink {
  id, name, ebomRootId, mbomRootId?, bopRootId?, owner, createdAt
}

// BOM 节点
BomNode {
  id, type: 'EBOM'|'MBOM',
  kind: 'part'|'phantom-semifinished'|'phantom-group'|'purchased'|'software-purchase',
  code, name, revision, parentId,
  makeType?: 'self'|'outsource'|'outsource-with-material',
  consumptionQuota?, scrapRate?, stationCode?,
  materialAttrs?: { reflush, cycle, fixedLossQty, fixedLossRate, spareRatio, subItemType },
  criticality: ''|'G'|'Z',
  lifecycleState: 'draft'|'in-review'|'released',
  jtModelRef?, drawingRef?
}

// 字典
DictionaryEntry { id, category: 'assembly-location'|'system-name'|..., code, label, sortOrder }

// 应用元数据
AppMeta {
  id: 'default',
  version: '11.0.0-p0',
  seededAt,
  counters: { bop: 0, operation: 0, document: 0 }
}
```

其余实体（BopNode、Operation、Resource、ProcessDocument、ChangeOrder、ApprovalRecord、Envelope）P0 仅定义类型与空表，不写入种子数据。

### 3.3 演示 EBOM 种子

- **型号代号**：`DEMO-ML-001`
- **协同关联名称**：`DEMO-ML-001 设计工艺协同`
- **树结构**：根节点 1 + 一级子件 5 + 二级子件 14 ≈ 20 节点
- **节点属性覆盖**：
  - 关重件：G（关键件）、Z（重要件）、空 各若干
  - 物料类型：自制件、外购件混合
  - 全部 `type: 'EBOM'`，`lifecycleState: 'released'`
- **协同关联**：`ebomRootId` 指向根节点，`mbomRootId` 与 `bopRootId` 为 `null`（P1 填充）

### 3.4 字典种子

内置 `lib/mock/dictionaries.json`：

- **装配地点**（`assembly-location`）：29 项，来自方案附件1
- **系统名称**（`system-name`）：21 项，来自方案附件2

### 3.5 Repository 模式

```ts
interface Repository<T, Id = string> {
  getAll(): Promise<T[]>
  getById(id: Id): Promise<T | undefined>
  create(entity: T): Promise<T>
  update(id: Id, partial: Partial<T>): Promise<T>
  delete(id: Id): Promise<void>
}
```

- P0 实现：`BomRepository`、`CollaborationRepository`、`DictionaryRepository`、`AppMetaRepository`
- 其余实体：定义接口 + 空实现或继承 base，供 P1+ 填充
- TanStack Query hooks 包装 Repository 调用
- 未来后端切换：实现 `ApiBomRepository` 等，替换 Dexie 实现即可

### 3.6 种子初始化流程

```
应用启动
  → Dexie 打开数据库
  → 读取 appMeta.seededAt
  → 若未初始化：
      1. 写入 dictionaries（50 条）
      2. 写入 bomNodes（~20 条 EBOM）
      3. 写入 collaborationLinks（1 条）
      4. 写入 appMeta（版本 + 计数器 + seededAt）
  → 若已初始化：跳过
```

设置页「重置为种子数据」：清空所有表后重新执行上述流程。

### 3.7 JSON 导入/导出

**导出格式**：

```json
{
  "version": "11.0.0-p0",
  "exportedAt": "ISO8601",
  "tables": {
    "collaborationLinks": [],
    "bomNodes": [],
    "bopNodes": [],
    "operations": [],
    "resources": [],
    "processDocuments": [],
    "changeOrders": [],
    "approvalRecords": [],
    "envelopes": [],
    "dictionaries": [],
    "appMeta": []
  }
}
```

- 导出：遍历所有表，触发浏览器下载 `.json` 文件
- 导入：上传文件 → Zod 校验顶层 schema → 确认对话框 → 清空表 → 批量写入
- 校验失败：展示 Zod 错误信息，不修改现有数据

### 3.8 流水码

`lib/domain/id-generator.ts` 提供：

- `nextBopCode()` → `AS0000001` 递增
- `nextOperationCode()` → `OP0000001` 递增
- `nextDocumentCode()` → `WD0000001` 递增

计数器存 `appMeta.counters`，P0 仅实现函数，P1 创建对象时调用。

---

## 4. 页面与交互

### 4.1 登录页 `/login`

- 品牌：Extech MPMS V11.0 + 北京艾克斯科技有限公司版权
- 表单：用户名 + 密码
- 校验：`admin` / `admin`（`lib/auth/mock-auth.ts`）
- 成功：写入 localStorage session token（UUID），跳转 `/`
- 失败：表单错误提示

### 4.2 路由守卫

- `(workspace)/layout.tsx` 检查 session，无 session 重定向 `/login`
- 已登录访问 `/login` 重定向 `/`

### 4.3 工作台首页 `/`

四张概览卡片：

| 卡片 | 数据来源 |
| --- | --- |
| EBOM 节点数 | `bomNodes` where type=EBOM count |
| 协同关联数 | `collaborationLinks` count |
| 字典条目数 | `dictionaries` count |
| 系统版本 | `appMeta.version` |

快捷入口按钮：制造工艺规划器、设置。

### 4.4 制造工艺规划器 `/planner`

P0 唯一有实质内容的业务页。

**布局**：

```
┌──────────────────────────────────────────────┐
│ 顶栏：协同关联名称 | 型号 DEMO-ML-001          │
├──────────────────┬───────────────────────────┤
│  EBOM 只读树      │  节点属性面板              │
│  (~20 节点)      │  (选中节点的字段展示)       │
│                  │                           │
└──────────────────┴───────────────────────────┘
```

**交互**：

- 树：展开/折叠，点击节点高亮并在右侧显示属性（图号、名称、版本、关重件、类型等）
- 使用 shadcn `ScrollArea` + 递归组件，不用 AG Grid
- 顶栏显示当前协同关联（从 Zustand + IndexedDB 读取）

**不做**：拖拽、MBOM 面板、工艺路线、三维窗口、属性编辑。

### 4.5 占位模块页

`ModulePlaceholder` 组件统一展示：

- 模块中文名
- 一行功能说明（摘自方案 §3.x）
- 标签：「计划于 P1/P2/... 实现」
- 可选：返回首页按钮

### 4.6 系统管理 `/admin`

子菜单占位：

- 用户管理 → `/admin/users`
- 字典管理 → `/admin/dictionaries`（只读列表展示已种子化的 50 条字典）
- 工作流模板 → `/admin/workflow-templates`
- 权限管理 → `/admin/permissions`

### 4.7 设置页 `/settings`

- **JSON 导出**：下载当前全库快照
- **JSON 导入**：上传覆盖（带确认对话框）
- **重置种子**：清空并重新初始化
- **数据库状态**：各表记录数列表

### 4.8 API Routes

**GET `/api/health`**

```json
{ "status": "ok", "version": "11.0.0-p0", "timestamp": "ISO8601" }
```

**GET `/api/3d/jt?nodeId={id}&rev={rev}`**

```json
{
  "nodeId": "xxx",
  "revision": "A",
  "fileName": "mock.jt",
  "downloadUrl": null,
  "message": "Mock 响应 - JT 下载服务待后端接入"
}
```

---

## 5. 认证与会话

### 5.1 Mock 认证

- 固定凭据：`admin` / `admin`
- Session 存 localStorage：`mpms_session = { token, userId: 'admin', displayName: '系统管理员' }`
- 无角色、无权限校验
- 登出：清除 localStorage，跳转 `/login`

### 5.2 顶栏用户区

- 显示「系统管理员」
- 下拉：设置、登出

---

## 6. 错误处理

| 场景 | 处理 |
| --- | --- |
| Dexie 打开失败 | Error Boundary + Toast「本地数据库初始化失败」 |
| 种子写入失败 | Toast + 控制台错误，阻止进入工作台 |
| JSON 导入格式错误 | Zod 校验错误列表展示，不修改数据 |
| JSON 导入用户取消 | 关闭对话框，无操作 |
| 未登录访问受保护路由 | 重定向 `/login` |
| API Route 缺少 nodeId | 400 + 错误信息 |

---

## 7. 品牌与文案

- 系统全称：Extech MPMS 制造工艺管理系统
- 版本号：V11.0（P0 内部版本 `11.0.0-p0`）
- 界面语言：简体中文（无国际化）
- 版权：© 2026 北京艾克斯科技有限公司 版权所有
- 浏览器标题：`Extech MPMS - {页面名}`

---

## 8. 实施顺序建议

| 步骤 | 内容 | 验证 |
| --- | --- | --- |
| 1 | Fork shadcn-admin，清理示例业务，改品牌 | 模板可运行 |
| 2 | 重构路由为 `(auth)` / `(workspace)` / `admin` | 路由可达 |
| 3 | 定义领域类型 + Zod schemas | TS 编译通过 |
| 4 | Dexie schema + Repository 实现 | 单元手动验证 |
| 5 | 种子数据 + 初始化流程 | 刷新后数据仍在 |
| 6 | Mock 登录 + 路由守卫 | 未登录跳转 |
| 7 | 侧栏 12 项 + 占位页 | 全部可导航 |
| 8 | 工作台首页概览卡片 | 数据正确 |
| 9 | 规划器只读 EBOM 树 | 树展开 + 属性面板 |
| 10 | 设置页导入/导出/重置 |  round-trip 验证 |
| 11 | API Routes | curl 200 |
| 12 | 收尾：Error Boundary、Toast、README | 冒烟通过 |

---

## 9. 风险与约束

1. **shadcn-admin 模板差异**：Fork 后 Next.js / React 版本可能与方案写法有偏差，以模板基线为准统一升级。
2. **IndexedDB 容量**：P0 数据量极小，无压力；工艺文件 Blob 在 P4 才大量写入。
3. **无 Git 仓库**：当前工作区未初始化 Git，首次提交前需 `git init`。
4. **演示种子非真实型号**：`DEMO-ML-001` 仅为 P0 演示，P1 可替换为真实 EBOM 导入逻辑。

---

## 10. 与总方案映射

| 总方案章节 | P0 实现度 |
| --- | --- |
| §2 技术栈 | 子集（不含 AG Grid 等） |
| §2.3 目录结构 | 骨架就位，业务组件占位 |
| §4.2 领域模型 | 全量类型定义 |
| §4.3 持久化 | Dexie + Repository + JSON 导入导出 |
| §6 字典数据 | 50 条种子入库 |
| §8 P0 基座 | 本规格全文 |
| §3.1 规划器 | 只读 EBOM 树演示 |
| §3.2–3.16 其余模块 | 占位页 |

---

*本规格为 P0 实施的唯一依据。P1 起以本规格 + 总方案 V0.1 联合指导。*
