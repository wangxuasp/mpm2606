# Extech MPMS P0 基座 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable P0 foundation for Extech MPMS V11.0 — shadcn-admin shell, IndexedDB data layer, demo EBOM seed, mock auth, and placeholder routes for all business modules.

**Architecture:** Fork `satnaing/shadcn-admin` as the UI shell; add Dexie.js persistence with Repository pattern behind TanStack Query hooks; seed dictionaries + demo EBOM on first launch; workspace routes guarded by mock session in localStorage.

**Tech Stack:** Next.js (App Router), TypeScript, shadcn/ui, Tailwind, Zustand, Dexie.js, Zod, TanStack Query, React Hook Form, pnpm

**Spec:** `docs/superpowers/specs/2026-06-23-mpms-p0-foundation-design.md`

**Note:** P0 不写自动化测试（规格 §1.4）；每 Task 以手动冒烟步骤代替 TDD。P1 起补 Vitest。

---

## File Map（P0 新建/改造一览）

| 路径 | 职责 |
| --- | --- |
| `lib/domain/types/*.ts` | 全量领域 TypeScript 类型 |
| `lib/domain/schemas/*.ts` | Zod 校验 schema |
| `lib/domain/id-generator.ts` | AS/OP/WD 流水码 |
| `lib/db/schema.ts` | Dexie 数据库定义 |
| `lib/db/seed.ts` | 种子初始化与重置 |
| `lib/db/export-import.ts` | JSON 整库导出/导入 |
| `lib/db/repositories/*.ts` | IndexedDB 仓储实现 |
| `lib/auth/mock-auth.ts` | admin/admin 校验 |
| `lib/auth/session.ts` | localStorage session |
| `lib/mock/dictionaries.json` | 50 条字典种子 |
| `lib/mock/seed-ebom.json` | ~20 节点 EBOM 种子 |
| `stores/workspace-store.ts` | 当前协同关联/型号 |
| `hooks/use-*.ts` | TanStack Query 包装 |
| `components/planner/*` | 只读 EBOM 树 + 属性面板 |
| `components/placeholders/module-placeholder.tsx` | 模块占位 |
| `components/providers/app-providers.tsx` | Query + DB 初始化 |
| `app/(auth)/login/page.tsx` | Mock 登录 |
| `app/(workspace)/**` | 工作台各模块页 |
| `app/admin/**` | 系统管理 |
| `app/api/health/route.ts` | 健康检查 |
| `app/api/3d/jt/route.ts` | JT Mock |

---

### Task 1: 脚手架 — Clone shadcn-admin 并验证可运行

**Files:**
- Create: 整个项目根目录（由 clone 产生）
- Modify: `package.json`（改名）

- [ ] **Step 1: Clone 模板到当前目录**

```powershell
cd "c:\My Projects\Codes\mpm2606\frontend"
# 若目录非空，先把设计文档挪到临时位置
git clone --depth 1 https://github.com/satnaing/shadcn-admin.git _tmp_admin
Get-ChildItem _tmp_admin -Force | Move-Item -Destination . -Force
Remove-Item _tmp_admin -Recurse -Force
```

- [ ] **Step 2: 安装依赖**

```powershell
pnpm install
```

- [ ] **Step 3: 修改 package.json 名称**

```json
{
  "name": "extech-mpms",
  "version": "11.0.0-p0"
}
```

- [ ] **Step 4: 启动开发服务器验证**

```powershell
pnpm dev
```

Expected: 浏览器 `http://localhost:5173` 或模板默认端口可访问，无编译错误。

- [ ] **Step 5: 初始化 Git 并提交**

```powershell
git init
git add .
git commit -m "chore: scaffold from shadcn-admin template"
```

---

### Task 2: 安装 P0 业务依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 添加依赖**

```powershell
pnpm add dexie zustand @tanstack/react-query zod react-hook-form @hookform/resolvers uuid
pnpm add -D @types/uuid
```

- [ ] **Step 2: 验证编译**

```powershell
pnpm build
```

Expected: BUILD SUCCESS（允许模板原有 warning，无 error）。

- [ ] **Step 3: Commit**

```powershell
git add package.json pnpm-lock.yaml
git commit -m "chore: add dexie, zustand, tanstack-query, zod deps"
```

---

### Task 3: 领域类型定义

**Files:**
- Create: `lib/domain/types/collaboration.ts`
- Create: `lib/domain/types/bom.ts`
- Create: `lib/domain/types/bop.ts`
- Create: `lib/domain/types/operation.ts`
- Create: `lib/domain/types/resource.ts`
- Create: `lib/domain/types/process-document.ts`
- Create: `lib/domain/types/change-order.ts`
- Create: `lib/domain/types/approval.ts`
- Create: `lib/domain/types/envelope.ts`
- Create: `lib/domain/types/dictionary.ts`
- Create: `lib/domain/types/app-meta.ts`
- Create: `lib/domain/types/index.ts`

- [ ] **Step 1: 创建 `lib/domain/types/bom.ts`**

```ts
export type BomType = 'EBOM' | 'MBOM'
export type BomKind =
  | 'part'
  | 'phantom-semifinished'
  | 'phantom-group'
  | 'purchased'
  | 'software-purchase'
export type MakeType = 'self' | 'outsource' | 'outsource-with-material'
export type Criticality = '' | 'G' | 'Z'
export type LifecycleState = 'draft' | 'in-review' | 'released'

export interface MaterialAttrs {
  reflush?: boolean
  cycle?: boolean
  fixedLossQty?: number
  fixedLossRate?: number
  spareRatio?: number
  subItemType?: string
}

export interface BomNode {
  id: string
  type: BomType
  kind: BomKind
  code: string
  name: string
  revision: string
  parentId: string | null
  makeType?: MakeType
  consumptionQuota?: number
  scrapRate?: number
  stationCode?: string
  materialAttrs?: MaterialAttrs
  criticality: Criticality
  lifecycleState: LifecycleState
  jtModelRef?: string
  drawingRef?: string
}
```

- [ ] **Step 2: 创建 `lib/domain/types/collaboration.ts`**

```ts
export interface CollaborationLink {
  id: string
  name: string
  ebomRootId: string
  mbomRootId: string | null
  bopRootId: string | null
  owner: string
  createdAt: string
}
```

- [ ] **Step 3: 创建 `lib/domain/types/dictionary.ts`**

```ts
export type DictionaryCategory = 'assembly-location' | 'system-name'

export interface DictionaryEntry {
  id: string
  category: DictionaryCategory
  code: string
  label: string
  sortOrder: number
}
```

- [ ] **Step 4: 创建 `lib/domain/types/app-meta.ts`**

```ts
export interface AppMeta {
  id: 'default'
  version: string
  seededAt: string | null
  counters: {
    bop: number
    operation: number
    document: number
  }
}
```

- [ ] **Step 5: 创建其余实体类型（bop, operation, resource, process-document, change-order, approval, envelope）**

参照规格 §3.2 与总方案 §4.2，每个文件导出一个 interface。示例 `lib/domain/types/bop.ts`：

```ts
import type { LifecycleState } from './bom'

export type BopLevel = 'machine' | 'stage' | 'operation'

export interface PertDag {
  nodes: { id: string; label: string }[]
  edges: { id: string; source: string; target: string }[]
}

export interface BopNode {
  id: string
  code: string
  name: string
  revision: string
  level: BopLevel
  parentId: string | null
  owner: string
  collaborators: string[]
  lifecycleState: LifecycleState
  linkedMbomNodeIds: string[]
  linkedEbomNodeIds: string[]
  pertDag: PertDag
}
```

`operation.ts`、`resource.ts`、`process-document.ts`、`change-order.ts`、`approval.ts`、`envelope.ts` 同理，字段与总方案 §4.2 一致。

- [ ] **Step 6: 创建 `lib/domain/types/index.ts` 统一导出**

```ts
export * from './collaboration'
export * from './bom'
export * from './bop'
export * from './operation'
export * from './resource'
export * from './process-document'
export * from './change-order'
export * from './approval'
export * from './envelope'
export * from './dictionary'
export * from './app-meta'
```

- [ ] **Step 7: 验证类型编译**

```powershell
pnpm exec tsc --noEmit
```

Expected: 无类型错误。

- [ ] **Step 8: Commit**

```powershell
git add lib/domain/types
git commit -m "feat: add domain type definitions"
```

---

### Task 4: Zod Schemas

**Files:**
- Create: `lib/domain/schemas/bom.ts`
- Create: `lib/domain/schemas/dictionary.ts`
- Create: `lib/domain/schemas/app-meta.ts`
- Create: `lib/domain/schemas/export-bundle.ts`
- Create: `lib/domain/schemas/index.ts`

- [ ] **Step 1: 创建 `lib/domain/schemas/bom.ts`**

```ts
import { z } from 'zod'

export const bomNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['EBOM', 'MBOM']),
  kind: z.enum(['part', 'phantom-semifinished', 'phantom-group', 'purchased', 'software-purchase']),
  code: z.string(),
  name: z.string(),
  revision: z.string(),
  parentId: z.string().nullable(),
  makeType: z.enum(['self', 'outsource', 'outsource-with-material']).optional(),
  consumptionQuota: z.number().optional(),
  scrapRate: z.number().optional(),
  stationCode: z.string().optional(),
  materialAttrs: z.object({
    reflush: z.boolean().optional(),
    cycle: z.boolean().optional(),
    fixedLossQty: z.number().optional(),
    fixedLossRate: z.number().optional(),
    spareRatio: z.number().optional(),
    subItemType: z.string().optional(),
  }).optional(),
  criticality: z.enum(['', 'G', 'Z']),
  lifecycleState: z.enum(['draft', 'in-review', 'released']),
  jtModelRef: z.string().optional(),
  drawingRef: z.string().optional(),
})
```

- [ ] **Step 2: 创建 `lib/domain/schemas/export-bundle.ts`（JSON 导入校验）**

```ts
import { z } from 'zod'
import { bomNodeSchema } from './bom'

export const exportBundleSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  tables: z.object({
    collaborationLinks: z.array(z.any()),
    bomNodes: z.array(bomNodeSchema),
    bopNodes: z.array(z.any()),
    operations: z.array(z.any()),
    resources: z.array(z.any()),
    processDocuments: z.array(z.any()),
    changeOrders: z.array(z.any()),
    approvalRecords: z.array(z.any()),
    envelopes: z.array(z.any()),
    dictionaries: z.array(z.any()),
    appMeta: z.array(z.any()),
  }),
})
```

- [ ] **Step 3: 为 dictionary、app-meta 等创建对应 schema，并在 `index.ts` 导出**

- [ ] **Step 4: Commit**

```powershell
git add lib/domain/schemas
git commit -m "feat: add zod schemas for domain entities"
```

---

### Task 5: Dexie 数据库 Schema

**Files:**
- Create: `lib/db/schema.ts`

- [ ] **Step 1: 创建 `lib/db/schema.ts`**

```ts
import Dexie, { type Table } from 'dexie'
import type {
  CollaborationLink,
  BomNode,
  BopNode,
  Operation,
  Resource,
  ProcessDocument,
  ChangeOrder,
  ApprovalRecord,
  Envelope,
  DictionaryEntry,
  AppMeta,
} from '@/lib/domain/types'

export class MpmsDatabase extends Dexie {
  collaborationLinks!: Table<CollaborationLink, string>
  bomNodes!: Table<BomNode, string>
  bopNodes!: Table<BopNode, string>
  operations!: Table<Operation, string>
  resources!: Table<Resource, string>
  processDocuments!: Table<ProcessDocument, string>
  changeOrders!: Table<ChangeOrder, string>
  approvalRecords!: Table<ApprovalRecord, string>
  envelopes!: Table<Envelope, string>
  dictionaries!: Table<DictionaryEntry, string>
  appMeta!: Table<AppMeta, string>

  constructor() {
    super('extech-mpms')
    this.version(1).stores({
      collaborationLinks: 'id, ebomRootId, name',
      bomNodes: 'id, type, parentId, code',
      bopNodes: 'id, parentId, code',
      operations: 'id, bopParentId, code',
      resources: 'id, kind, code',
      processDocuments: 'id, linkedObjectId, code',
      changeOrders: 'id, productCode',
      approvalRecords: 'id, targetId, targetType',
      envelopes: 'id, direction, createdAt',
      dictionaries: 'id, category, sortOrder',
      appMeta: 'id',
    })
  }
}

export const db = new MpmsDatabase()
```

- [ ] **Step 2: Commit**

```powershell
git add lib/db/schema.ts
git commit -m "feat: add Dexie database schema"
```

---

### Task 6: Repository 层

**Files:**
- Create: `lib/db/repositories/base.ts`
- Create: `lib/db/repositories/bom-repository.ts`
- Create: `lib/db/repositories/collaboration-repository.ts`
- Create: `lib/db/repositories/dictionary-repository.ts`
- Create: `lib/db/repositories/app-meta-repository.ts`
- Create: `lib/db/repositories/index.ts`

- [ ] **Step 1: 创建 `lib/db/repositories/base.ts`**

```ts
export interface Repository<T, Id = string> {
  getAll(): Promise<T[]>
  getById(id: Id): Promise<T | undefined>
  create(entity: T): Promise<T>
  update(id: Id, partial: Partial<T>): Promise<T>
  delete(id: Id): Promise<void>
}
```

- [ ] **Step 2: 创建 `lib/db/repositories/bom-repository.ts`**

```ts
import { db } from '@/lib/db/schema'
import type { BomNode } from '@/lib/domain/types'
import type { Repository } from './base'

export const bomRepository: Repository<BomNode> = {
  async getAll() {
    return db.bomNodes.toArray()
  },
  async getById(id) {
    return db.bomNodes.get(id)
  },
  async create(entity) {
    await db.bomNodes.add(entity)
    return entity
  },
  async update(id, partial) {
    await db.bomNodes.update(id, partial)
    const updated = await db.bomNodes.get(id)
    if (!updated) throw new Error(`BomNode ${id} not found`)
    return updated
  },
  async delete(id) {
    await db.bomNodes.delete(id)
  },
}

export async function getEbomNodes(): Promise<BomNode[]> {
  return db.bomNodes.where('type').equals('EBOM').toArray()
}

export async function countEbomNodes(): Promise<number> {
  return db.bomNodes.where('type').equals('EBOM').count()
}
```

- [ ] **Step 3: 同理实现 collaboration、dictionary、app-meta repository**

`dictionary-repository.ts` 额外提供：

```ts
export async function getByCategory(category: DictionaryCategory) {
  return db.dictionaries.where('category').equals(category).sortBy('sortOrder')
}
```

- [ ] **Step 4: `lib/db/repositories/index.ts` 统一导出**

- [ ] **Step 5: Commit**

```powershell
git add lib/db/repositories
git commit -m "feat: add IndexedDB repository layer"
```

---

### Task 7: 种子数据 JSON

**Files:**
- Create: `lib/mock/dictionaries.json`
- Create: `lib/mock/seed-ebom.json`
- Create: `lib/mock/collaboration.json`

- [ ] **Step 1: 创建 `lib/mock/dictionaries.json`**

包含 50 条：29 条 `assembly-location` + 21 条 `system-name`。装配地点来自总方案 §6 附件1，系统名称来自附件2。结构示例：

```json
[
  { "id": "loc-001", "category": "assembly-location", "code": "ML-01", "label": "ML集成区1", "sortOrder": 1 },
  { "id": "loc-002", "category": "assembly-location", "code": "ML-02", "label": "ML集成区2", "sortOrder": 2 }
]
```

完整 29+21 条按总方案 §6 列表填满。

- [ ] **Step 2: 创建 `lib/mock/seed-ebom.json`**

~20 个 BomNode，根节点 `ebom-root-demo`：

```json
[
  {
    "id": "ebom-root-demo",
    "type": "EBOM",
    "kind": "part",
    "code": "DEMO-ML-001",
    "name": "整机结构ML演示总成",
    "revision": "A",
    "parentId": null,
    "makeType": "self",
    "criticality": "",
    "lifecycleState": "released"
  },
  {
    "id": "ebom-001",
    "type": "EBOM",
    "kind": "part",
    "code": "DEMO-ML-001-01",
    "name": "上框架组件",
    "revision": "A",
    "parentId": "ebom-root-demo",
    "makeType": "self",
    "criticality": "G",
    "lifecycleState": "released"
  }
]
```

继续补充至 20 节点：5 个一级子件，每个下挂 2–3 个二级子件；`criticality` 覆盖 G/Z/空；`kind` 混合 part 与 purchased。

- [ ] **Step 3: 创建 `lib/mock/collaboration.json`**

```json
[
  {
    "id": "collab-demo-001",
    "name": "DEMO-ML-001 设计工艺协同",
    "ebomRootId": "ebom-root-demo",
    "mbomRootId": null,
    "bopRootId": null,
    "owner": "admin",
    "createdAt": "2026-06-23T00:00:00.000Z"
  }
]
```

- [ ] **Step 4: Commit**

```powershell
git add lib/mock
git commit -m "feat: add seed data for dictionaries, EBOM, collaboration"
```

---

### Task 8: 种子初始化逻辑

**Files:**
- Create: `lib/db/seed.ts`
- Create: `lib/domain/id-generator.ts`

- [ ] **Step 1: 创建 `lib/db/seed.ts`**

```ts
import { db } from './schema'
import dictionaries from '@/lib/mock/dictionaries.json'
import seedEbom from '@/lib/mock/seed-ebom.json'
import seedCollaboration from '@/lib/mock/collaboration.json'
import type { DictionaryEntry, BomNode, CollaborationLink, AppMeta } from '@/lib/domain/types'

export async function isSeeded(): Promise<boolean> {
  const meta = await db.appMeta.get('default')
  return !!meta?.seededAt
}

export async function seedDatabase(): Promise<void> {
  await db.transaction('rw', [
    db.collaborationLinks, db.bomNodes, db.dictionaries, db.appMeta,
    db.bopNodes, db.operations, db.resources, db.processDocuments,
    db.changeOrders, db.approvalRecords, db.envelopes,
  ], async () => {
    await db.collaborationLinks.clear()
    await db.bomNodes.clear()
    await db.dictionaries.clear()
    await db.bopNodes.clear()
    await db.operations.clear()
    await db.resources.clear()
    await db.processDocuments.clear()
    await db.changeOrders.clear()
    await db.approvalRecords.clear()
    await db.envelopes.clear()

    await db.dictionaries.bulkAdd(dictionaries as DictionaryEntry[])
    await db.bomNodes.bulkAdd(seedEbom as BomNode[])
    await db.collaborationLinks.bulkAdd(seedCollaboration as CollaborationLink[])

    const meta: AppMeta = {
      id: 'default',
      version: '11.0.0-p0',
      seededAt: new Date().toISOString(),
      counters: { bop: 0, operation: 0, document: 0 },
    }
    await db.appMeta.put(meta)
  })
}

export async function ensureSeeded(): Promise<void> {
  if (!(await isSeeded())) {
    await seedDatabase()
  }
}

export async function resetToSeed(): Promise<void> {
  await seedDatabase()
}
```

- [ ] **Step 2: 创建 `lib/domain/id-generator.ts`**

```ts
import { db } from '@/lib/db/schema'

async function nextCounter(key: 'bop' | 'operation' | 'document', prefix: string): Promise<string> {
  const meta = await db.appMeta.get('default')
  if (!meta) throw new Error('AppMeta not initialized')
  const next = meta.counters[key] + 1
  await db.appMeta.update('default', {
    counters: { ...meta.counters, [key]: next },
  })
  return `${prefix}${String(next).padStart(7, '0')}`
}

export const nextBopCode = () => nextCounter('bop', 'AS')
export const nextOperationCode = () => nextCounter('operation', 'OP')
export const nextDocumentCode = () => nextCounter('document', 'WD')
```

- [ ] **Step 3: 在 `tsconfig.json` 确保 `resolveJsonModule: true`**

- [ ] **Step 4: Commit**

```powershell
git add lib/db/seed.ts lib/domain/id-generator.ts
git commit -m "feat: add database seed and id generator"
```

---

### Task 9: JSON 导入/导出

**Files:**
- Create: `lib/db/export-import.ts`

- [ ] **Step 1: 创建 `lib/db/export-import.ts`**

```ts
import { db } from './schema'
import { exportBundleSchema } from '@/lib/domain/schemas/export-bundle'

const TABLE_NAMES = [
  'collaborationLinks', 'bomNodes', 'bopNodes', 'operations', 'resources',
  'processDocuments', 'changeOrders', 'approvalRecords', 'envelopes',
  'dictionaries', 'appMeta',
] as const

export async function exportDatabase() {
  const tables: Record<string, unknown[]> = {}
  for (const name of TABLE_NAMES) {
    tables[name] = await db.table(name).toArray()
  }
  return {
    version: '11.0.0-p0',
    exportedAt: new Date().toISOString(),
    tables,
  }
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function importDatabase(raw: unknown) {
  const parsed = exportBundleSchema.parse(raw)
  await db.transaction('rw', TABLE_NAMES.map(n => db.table(n)), async () => {
    for (const name of TABLE_NAMES) {
      const table = db.table(name)
      await table.clear()
      const rows = parsed.tables[name as keyof typeof parsed.tables]
      if (rows?.length) await table.bulkAdd(rows)
    }
  })
}

export async function getTableCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const name of TABLE_NAMES) {
    counts[name] = await db.table(name).count()
  }
  return counts
}
```

- [ ] **Step 2: Commit**

```powershell
git add lib/db/export-import.ts
git commit -m "feat: add JSON export/import utilities"
```

---

### Task 10: Mock 认证

**Files:**
- Create: `lib/auth/mock-auth.ts`
- Create: `lib/auth/session.ts`

- [ ] **Step 1: 创建 `lib/auth/mock-auth.ts`**

```ts
const VALID_USER = 'admin'
const VALID_PASS = 'admin'

export function validateCredentials(username: string, password: string): boolean {
  return username === VALID_USER && password === VALID_PASS
}
```

- [ ] **Step 2: 创建 `lib/auth/session.ts`**

```ts
const SESSION_KEY = 'mpms_session'

export interface Session {
  token: string
  userId: string
  displayName: string
}

export function createSession(): Session {
  const session: Session = {
    token: crypto.randomUUID(),
    userId: 'admin',
    displayName: '系统管理员',
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}
```

- [ ] **Step 3: Commit**

```powershell
git add lib/auth
git commit -m "feat: add mock auth and session management"
```

---

### Task 11: App Providers（Query + DB 初始化）

**Files:**
- Create: `components/providers/app-providers.tsx`
- Modify: 根 layout（模板中 `src/main.tsx` 或 `app/layout.tsx`，以 clone 后实际结构为准）

- [ ] **Step 1: 创建 `components/providers/app-providers.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ensureSeeded } from '@/lib/db/seed'

const queryClient = new QueryClient()

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ensureSeeded()
      .then(() => setReady(true))
      .catch((e) => setError(e instanceof Error ? e.message : '数据库初始化失败'))
  }, [])

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-destructive">本地数据库初始化失败：{error}</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">正在初始化...</p>
      </div>
    )
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

- [ ] **Step 2: 在根 layout 包裹 `<AppProviders>`**

- [ ] **Step 3: 手动验证**

```powershell
pnpm dev
```

打开浏览器 → 应短暂显示「正在初始化...」后进入应用。

- [ ] **Step 4: Commit**

```powershell
git add components/providers
git commit -m "feat: add app providers with DB seed on mount"
```

---

### Task 12: 品牌改造与路由重组

**Files:**
- Modify: 侧栏/顶栏组件（模板内 `src/components/layout/` 或等效路径）
- Create: `app/(auth)/login/page.tsx`（若模板用 React Router，则改造为 Next.js 或保留 Vite 路由 — **以 clone 后模板实际路由方案为准**）

> **注意：** `satnaing/shadcn-admin` 当前基于 **Vite + React Router**，非 Next.js。若 clone 后发现是 Vite 项目，有两种处理：
> A) 保留 Vite，按 Vite 目录结构调整本计划路径（`src/` 前缀）
> B) 改用 `create-next-app` + 手动移植 shadcn-admin 布局组件
>
> **推荐：** Clone 后先确认模板技术栈。若是 Vite，将本计划所有 `app/` 路径映射为 `src/routes/` + React Router；API Route 改为 Vite 无后端，JT/health 用 `src/lib/mock-api.ts` 占位，待后续迁移 Next.js 时再建 `app/api/`。
>
> 若用户坚持规格中的 Next.js，Task 1 应改为：

```powershell
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npx shadcn@latest init
# 再从 shadcn-admin 复制 layout 组件
```

**执行前必须先确认模板栈，再调整路径。以下步骤假设最终采用 Next.js App Router。**

- [ ] **Step 1: 修改浏览器标题与品牌文案**

全局 metadata / `<title>`：`Extech MPMS - {页面名}`

- [ ] **Step 2: 侧栏 Logo 区改为「Extech MPMS V11.0」**

- [ ] **Step 3: 页脚版权「© 2026 北京艾克斯科技有限公司」**

- [ ] **Step 4: Commit**

```powershell
git commit -am "feat: rebrand to Extech MPMS"
```

---

### Task 13: 侧栏导航（12 项）

**Files:**
- Modify: 侧栏导航配置（模板 `sidebar-data.ts` 或等效）
- Create: `lib/navigation.ts`

- [ ] **Step 1: 创建 `lib/navigation.ts`**

```ts
import {
  LayoutDashboard, GitBranch, Route, Wrench, FolderOpen,
  FileText, Hammer, RefreshCw, CheckCircle, BarChart3,
  Bot, Settings, Shield,
} from 'lucide-react'

export const workspaceNav = [
  { title: '工作台', url: '/', icon: LayoutDashboard },
  { title: '制造工艺规划器', url: '/planner', icon: GitBranch },
  { title: 'MBOM 重构', url: '/mbom', icon: GitBranch },
  { title: '工艺路线', url: '/bop', icon: Route },
  { title: '工序编制', url: '/operation', icon: Wrench },
  { title: '工艺资源库', url: '/resource', icon: FolderOpen },
  { title: '工艺文件', url: '/document', icon: FileText },
  { title: '工装管理', url: '/tooling', icon: Hammer },
  { title: '工艺更改', url: '/change', icon: RefreshCw },
  { title: '工艺审批', url: '/approval', icon: CheckCircle },
  { title: '工艺汇总', url: '/summary', icon: BarChart3 },
  { title: 'AI Copilot', url: '/copilot', icon: Bot },
]

export const footerNav = [
  { title: '设置', url: '/settings', icon: Settings },
  { title: '系统管理', url: '/admin', icon: Shield },
]
```

- [ ] **Step 2: 替换模板原有 sidebar items 为上述配置**

- [ ] **Step 3: 手动验证 — 侧栏显示 12 个中文菜单项**

- [ ] **Step 4: Commit**

```powershell
git add lib/navigation.ts
git commit -m "feat: configure MPMS sidebar navigation"
```

---

### Task 14: 登录页与路由守卫

**Files:**
- Create: `app/(auth)/login/page.tsx`（或 `src/routes/login.tsx`）
- Modify: workspace layout 添加守卫

- [ ] **Step 1: 创建登录页**

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation' // 或 react-router useNavigate
import { validateCredentials } from '@/lib/auth/mock-auth'
import { createSession, isAuthenticated } from '@/lib/auth/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

export default function LoginPage() {
  const router = useRouter()
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  })

  if (typeof window !== 'undefined' && isAuthenticated()) {
    router.replace('/')
    return null
  }

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    if (!validateCredentials(data.username, data.password)) {
      setError('password', { message: '用户名或密码错误' })
      return
    }
    createSession()
    router.replace('/')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Extech MPMS 制造工艺管理系统</h1>
        <p className="text-muted-foreground">V11.0</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex w-80 flex-col gap-4">
        <div>
          <Label htmlFor="username">用户名</Label>
          <Input id="username" {...register('username')} />
          {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
        </div>
        <div>
          <Label htmlFor="password">密码</Label>
          <Input id="password" type="password" {...register('password')} />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
        <Button type="submit">登录</Button>
      </form>
      <p className="text-xs text-muted-foreground">© 2026 北京艾克斯科技有限公司 版权所有</p>
    </div>
  )
}
```

- [ ] **Step 2: 在 workspace layout 添加守卫**

```tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, clearSession } from '@/lib/auth/session'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => {
    if (!isAuthenticated()) router.replace('/login')
  }, [router])
  return <>{children}</>
}
```

顶栏用户下拉添加「登出」：`clearSession(); router.push('/login')`

- [ ] **Step 3: 手动验证**

1. 未登录访问 `/` → 跳转 `/login`
2. `admin/admin` 登录 → 进入工作台
3. 错误密码 → 显示错误
4. 登出 → 回登录页

- [ ] **Step 4: Commit**

```powershell
git commit -am "feat: add mock login and route guard"
```

---

### Task 15: 模块占位组件与占位页

**Files:**
- Create: `components/placeholders/module-placeholder.tsx`
- Create: 各模块 page（mbom, bop, operation, resource, document, tooling, change, approval, summary, copilot）
- Create: `app/admin/users/page.tsx` 等 admin 子页

- [ ] **Step 1: 创建 `components/placeholders/module-placeholder.tsx`**

```tsx
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ModulePlaceholderProps {
  title: string
  description: string
  plannedPhase: string
}

export function ModulePlaceholder({ title, description, plannedPhase }: ModulePlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-center text-muted-foreground">{description}</p>
      <Badge variant="secondary">计划于 {plannedPhase} 实现</Badge>
      <Button asChild variant="outline">
        <Link href="/">返回工作台</Link>
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: 创建各占位页（示例 `app/(workspace)/mbom/page.tsx`）**

```tsx
import { ModulePlaceholder } from '@/components/placeholders/module-placeholder'

export default function MbomPage() {
  return (
    <ModulePlaceholder
      title="MBOM 重构"
      description="将设计视角 EBOM 转化为制造视角 MBOM，支持虚拟件、批量属性编辑与责信度检查。"
      plannedPhase="P1"
    />
  )
}
```

其余页面按规格 §2.5 和总方案 §3.x 填写 title/description/plannedPhase：

| 路由 | plannedPhase |
| --- | --- |
| `/bop` | P2 |
| `/operation` | P3 |
| `/resource` | P4 |
| `/document` | P4 |
| `/tooling` | P4 |
| `/change` | P5 |
| `/approval` | P5 |
| `/summary` | P6 |
| `/copilot` | P7 |
| `/admin/users` | 后续 |
| `/admin/workflow-templates` | P5 |
| `/admin/permissions` | 后续 |

- [ ] **Step 3: 手动验证 — 每个路由可访问且显示占位**

- [ ] **Step 4: Commit**

```powershell
git commit -am "feat: add module placeholder pages"
```

---

### Task 16: TanStack Query Hooks

**Files:**
- Create: `hooks/use-bom-nodes.ts`
- Create: `hooks/use-dictionaries.ts`
- Create: `hooks/use-collaboration.ts`
- Create: `hooks/use-app-meta.ts`
- Create: `stores/workspace-store.ts`

- [ ] **Step 1: 创建 hooks（示例 `hooks/use-bom-nodes.ts`）**

```ts
import { useQuery } from '@tanstack/react-query'
import { getEbomNodes, countEbomNodes } from '@/lib/db/repositories/bom-repository'

export function useEbomNodes() {
  return useQuery({ queryKey: ['ebom-nodes'], queryFn: getEbomNodes })
}

export function useEbomCount() {
  return useQuery({ queryKey: ['ebom-count'], queryFn: countEbomNodes })
}
```

- [ ] **Step 2: 创建 `stores/workspace-store.ts`**

```ts
import { create } from 'zustand'

interface WorkspaceState {
  collaborationId: string | null
  productCode: string | null
  setCollaboration: (id: string, productCode: string) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  collaborationId: 'collab-demo-001',
  productCode: 'DEMO-ML-001',
  setCollaboration: (id, productCode) => set({ collaborationId: id, productCode }),
}))
```

- [ ] **Step 3: Commit**

```powershell
git add hooks stores
git commit -m "feat: add query hooks and workspace store"
```

---

### Task 17: 工作台首页

**Files:**
- Create/Modify: `app/(workspace)/page.tsx`

- [ ] **Step 1: 实现概览卡片页**

```tsx
'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useEbomCount } from '@/hooks/use-bom-nodes'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/db/schema'

export default function DashboardPage() {
  const { data: ebomCount = 0 } = useEbomCount()
  const { data: collabCount = 0 } = useQuery({
    queryKey: ['collab-count'],
    queryFn: () => db.collaborationLinks.count(),
  })
  const { data: dictCount = 0 } = useQuery({
    queryKey: ['dict-count'],
    queryFn: () => db.dictionaries.count(),
  })
  const { data: version = '11.0.0-p0' } = useQuery({
    queryKey: ['app-version'],
    queryFn: async () => (await db.appMeta.get('default'))?.version ?? '11.0.0-p0',
  })

  const cards = [
    { title: 'EBOM 节点数', value: ebomCount },
    { title: '协同关联数', value: collabCount },
    { title: '字典条目数', value: dictCount },
    { title: '系统版本', value: version },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">工作台</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader><CardTitle className="text-sm font-medium">{c.title}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{c.value}</p></CardContent>
          </Card>
        ))}
      </div>
      <div className="flex gap-3">
        <Button asChild><Link href="/planner">制造工艺规划器</Link></Button>
        <Button asChild variant="outline"><Link href="/settings">设置</Link></Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 手动验证 — 四张卡片数据：EBOM≈20, 协同=1, 字典=50, 版本=11.0.0-p0**

- [ ] **Step 3: Commit**

```powershell
git commit -am "feat: add dashboard with overview cards"
```

---

### Task 18: 制造工艺规划器（只读 EBOM 树）

**Files:**
- Create: `components/planner/ebom-readonly-tree.tsx`
- Create: `components/planner/node-property-panel.tsx`
- Create: `app/(workspace)/planner/page.tsx`

- [ ] **Step 1: 创建 `components/planner/ebom-readonly-tree.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { BomNode } from '@/lib/domain/types'
import { cn } from '@/lib/utils'

function buildTree(nodes: BomNode[], parentId: string | null = null): BomNode[] {
  return nodes.filter((n) => n.parentId === parentId)
}

function TreeNode({
  node, allNodes, selectedId, onSelect, depth = 0,
}: {
  node: BomNode
  allNodes: BomNode[]
  selectedId: string | null
  onSelect: (id: string) => void
  depth?: number
}) {
  const [open, setOpen] = useState(depth < 2)
  const children = buildTree(allNodes, node.id)
  const hasChildren = children.length > 0

  return (
    <div>
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm hover:bg-muted',
          selectedId === node.id && 'bg-muted font-medium',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <span onClick={(e) => { e.stopPropagation(); setOpen(!open) }}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        ) : <span className="w-4" />}
        <span className="truncate">{node.code} — {node.name}</span>
      </button>
      {open && children.map((child) => (
        <TreeNode key={child.id} node={child} allNodes={allNodes} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  )
}

export function EbomReadonlyTree({ nodes, selectedId, onSelect }: {
  nodes: BomNode[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const roots = buildTree(nodes, null)
  return (
    <ScrollArea className="h-[calc(100vh-12rem)] rounded-md border p-2">
      {roots.map((root) => (
        <TreeNode key={root.id} node={root} allNodes={nodes} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </ScrollArea>
  )
}
```

- [ ] **Step 2: 创建 `components/planner/node-property-panel.tsx`**

展示选中节点字段：图号、名称、版本、类型、关重件、制造类型、生命周期等（`dl` 列表或 Card 字段行）。

- [ ] **Step 3: 创建 `app/(workspace)/planner/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useEbomNodes } from '@/hooks/use-bom-nodes'
import { useQuery } from '@tanstack/react-query'
import { db } from '@/lib/db/schema'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { EbomReadonlyTree } from '@/components/planner/ebom-readonly-tree'
import { NodePropertyPanel } from '@/components/planner/node-property-panel'

export default function PlannerPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: nodes = [] } = useEbomNodes()
  const productCode = useWorkspaceStore((s) => s.productCode)
  const { data: collab } = useQuery({
    queryKey: ['collab-demo'],
    queryFn: () => db.collaborationLinks.get('collab-demo-001'),
  })
  const selected = nodes.find((n) => n.id === selectedId) ?? null

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-4 border-b pb-4">
        <h1 className="text-xl font-semibold">制造工艺规划器</h1>
        <span className="text-muted-foreground">{collab?.name}</span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">型号 {productCode}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-medium">EBOM 结构树</h2>
          <EbomReadonlyTree nodes={nodes} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div>
          <h2 className="mb-2 text-sm font-medium">节点属性</h2>
          <NodePropertyPanel node={selected} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 手动验证**

1. `/planner` 显示 EBOM 树，可展开约 20 节点
2. 点击节点，右侧显示属性
3. 顶栏显示协同关联名与 DEMO-ML-001

- [ ] **Step 5: Commit**

```powershell
git commit -am "feat: add planner page with readonly EBOM tree"
```

---

### Task 19: 设置页（导入/导出/重置）

**Files:**
- Create: `app/(workspace)/settings/page.tsx`

- [ ] **Step 1: 实现设置页**

功能：
- 「导出 JSON」按钮 → `exportDatabase()` + `downloadJson()`
- 「导入 JSON」→ `<input type="file">` → 确认对话框 → `importDatabase()`
- 「重置种子」→ 确认 → `resetToSeed()` + `queryClient.invalidateQueries()`
- 表记录数列表 → `getTableCounts()`

导入 Zod 失败时用 `Alert` 展示 `error.errors`。

- [ ] **Step 2: 手动验证 round-trip**

1. 导出 JSON → 文件可下载
2. 修改本地数据后导入导出文件 → 数据恢复
3. 重置种子 → 计数恢复 EBOM≈20, dict=50

- [ ] **Step 3: Commit**

```powershell
git commit -am "feat: add settings page with JSON import/export"
```

---

### Task 20: 字典管理只读页

**Files:**
- Create: `app/admin/dictionaries/page.tsx`

- [ ] **Step 1: 实现只读字典列表**

用 shadcn `Table` 展示 50 条字典：`category`、`code`、`label`、`sortOrder`；支持按 category 筛选（Tabs：全部 / 装配地点 / 系统名称）。

- [ ] **Step 2: 手动验证 — `/admin/dictionaries` 显示 50 条**

- [ ] **Step 3: Commit**

```powershell
git commit -am "feat: add read-only dictionary admin page"
```

---

### Task 21: API Routes

**Files:**
- Create: `app/api/health/route.ts`
- Create: `app/api/3d/jt/route.ts`

> 若使用 Vite 无 API Route，跳过此 Task，在 README 注明 P0 未含服务端 API。

- [ ] **Step 1: 创建 health route**

```ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '11.0.0-p0',
    timestamp: new Date().toISOString(),
  })
}
```

- [ ] **Step 2: 创建 JT mock route**

```ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const nodeId = request.nextUrl.searchParams.get('nodeId')
  if (!nodeId) {
    return NextResponse.json({ error: 'nodeId is required' }, { status: 400 })
  }
  const rev = request.nextUrl.searchParams.get('rev') ?? 'A'
  return NextResponse.json({
    nodeId,
    revision: rev,
    fileName: 'mock.jt',
    downloadUrl: null,
    message: 'Mock 响应 - JT 下载服务待后端接入',
  })
}
```

- [ ] **Step 3: 手动验证**

```powershell
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/3d/jt?nodeId=ebom-root-demo"
```

Expected: 200 + JSON 符合规格 §4.8

- [ ] **Step 4: Commit**

```powershell
git add app/api
git commit -m "feat: add health and JT mock API routes"
```

---

### Task 22: README 与最终冒烟

**Files:**
- Create: `README.md`

- [ ] **Step 1: 编写 README**

包含：
- 项目简介（Extech MPMS P0）
- 技术栈
- 启动命令 `pnpm install && pnpm dev`
- 登录凭据 `admin/admin`
- P0 功能清单与成功标准勾选
- 指向规格文档路径

- [ ] **Step 2: 完整冒烟清单**

```
- [ ] pnpm dev 无报错
- [ ] admin/admin 登录成功
- [ ] 侧栏 12 项 + 设置 + admin 子页可导航
- [ ] 工作台四卡片数据正确
- [ ] 规划器 EBOM 树 + 属性面板
- [ ] 字典管理 50 条
- [ ] JSON 导出/导入/重置
- [ ] 刷新后 IndexedDB 数据仍在
- [ ] /api/health 与 /api/3d/jt 返回正确（若 Next.js）
- [ ] pnpm build 成功
```

- [ ] **Step 3: 最终 Commit**

```powershell
git add README.md
git commit -m "docs: add README and complete P0 foundation"
```

---

## Spec Coverage Checklist

| 规格要求 | 对应 Task |
| --- | --- |
| shadcn-admin 脚手架 | Task 1, 12 |
| 标准 Next.js + API Route | Task 1, 21（或 Vite 变通见 Task 12 注） |
| 全量领域类型 | Task 3 |
| Dexie 全表 | Task 5 |
| Repository 模式 | Task 6 |
| 字典 50 条种子 | Task 7, 8 |
| EBOM ~20 节点种子 | Task 7, 8 |
| 协同关联 1 条 | Task 7, 8 |
| Mock 登录 admin/admin | Task 10, 14 |
| 路由守卫 | Task 14 |
| 侧栏 12 项 | Task 13 |
| 占位模块页 | Task 15 |
| 工作台概览 | Task 17 |
| 规划器只读树 | Task 18 |
| 字典管理只读 | Task 20 |
| JSON 导入/导出/重置 | Task 9, 19 |
| API health + JT mock | Task 21 |
| 流水码 generator | Task 8 |
| 品牌文案 | Task 12 |

---

## Risk: shadcn-admin 技术栈

`satnaing/shadcn-admin` 当前为 **Vite + React Router**，与规格要求的 **Next.js App Router** 不一致。Task 1 执行后必须立即确认：

- **若是 Vite：** 按 Vite 路径完成 P0，API Route 用客户端 mock；在 README 标注「P0.1 迁移 Next.js」为后续任务。
- **若坚持 Next.js：** Task 1 改用 `create-next-app`，从 shadcn-admin **仅复制 UI 布局组件**，不整库 clone。

**推荐执行顺序：** Clone → 确认栈 → 若 Vite 则先完成 P0 功能验证 → 单独开 P0.5 迁移 Next.js（不在本计划范围）。

---

*Plan complete.*
