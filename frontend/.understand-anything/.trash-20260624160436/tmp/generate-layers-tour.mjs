import fs from 'fs'
import path from 'path'

const root = process.argv[2]
const graphPath = path.join(root, '.understand-anything/intermediate/assembled-graph.json')
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'))

const fileNodes = graph.nodes.filter((n) =>
  ['file', 'config', 'document', 'service', 'pipeline', 'schema', 'resource', 'table', 'endpoint'].includes(n.type),
)

function layerFor(node) {
  const fp = node.filePath || ''
  if (fp.startsWith('src/app/')) return 'layer:app-routes'
  if (fp.startsWith('src/components/')) return 'layer:ui-components'
  if (fp.startsWith('src/hooks/') || fp.startsWith('src/stores/')) return 'layer:client-state'
  if (fp.startsWith('src/lib/domain/')) return 'layer:domain'
  if (fp.startsWith('src/lib/')) return 'layer:infrastructure'
  if (fp.startsWith('docs/') || fp.endsWith('.md')) return 'layer:documentation'
  if (['package.json', 'tsconfig.json', 'next.config.ts', 'eslint.config.mjs', 'postcss.config.mjs', 'components.json'].includes(fp))
    return 'layer:configuration'
  if (fp.startsWith('.cursor/') || fp.startsWith('.understand-anything/')) return 'layer:tooling'
  return 'layer:misc'
}

const layerDefs = {
  'layer:app-routes': {
    id: 'layer:app-routes',
    name: '应用路由层',
    description: 'Next.js App Router 页面、布局与 API 路由，承载各业务模块入口。',
  },
  'layer:ui-components': {
    id: 'layer:ui-components',
    name: 'UI 组件层',
    description: '可复用 React 组件，包括布局、业务面板与 shadcn/ui 封装。',
  },
  'layer:client-state': {
    id: 'layer:client-state',
    name: '客户端状态层',
    description: 'Hooks 与 Zustand stores，负责数据订阅与工作区状态。',
  },
  'layer:domain': {
    id: 'layer:domain',
    name: '领域层',
    description: '领域类型、服务与业务规则，实现 MPMS 核心逻辑。',
  },
  'layer:infrastructure': {
    id: 'layer:infrastructure',
    name: '基础设施层',
    description: '数据库、认证、导航、AI 与工作流等横切能力。',
  },
  'layer:configuration': {
    id: 'layer:configuration',
    name: '配置层',
    description: '构建、编译与工具链配置文件。',
  },
  'layer:documentation': {
    id: 'layer:documentation',
    name: '文档层',
    description: '设计规格、计划与说明文档。',
  },
  'layer:tooling': {
    id: 'layer:tooling',
    name: '工具与规则',
    description: 'IDE 规则与分析工具元数据。',
  },
  'layer:misc': {
    id: 'layer:misc',
    name: '其他',
    description: '未归入上述分层的文件。',
  },
}

const buckets = new Map()
for (const n of fileNodes) {
  const lid = layerFor(n)
  if (!buckets.has(lid)) buckets.set(lid, [])
  buckets.get(lid).push(n.id)
}

const layers = [...buckets.entries()].map(([id, nodeIds]) => ({
  ...layerDefs[id],
  nodeIds,
}))

const tour = [
  {
    order: 1,
    title: '项目概览',
    description: '从 README 了解 Extech MPMS P0 基座的目标、技术栈与快速开始方式。',
    nodeIds: ['document:README.md'],
  },
  {
    order: 2,
    title: '应用入口',
    description: '根布局与 Provider 装配主题、查询客户端与全局外壳。',
    nodeIds: ['file:src/app/layout.tsx', 'file:src/components/providers/app-providers.tsx'],
  },
  {
    order: 3,
    title: '工作台路由',
    description: '工作台布局将认证守卫、侧栏与顶栏组合，承载 12 个业务模块入口。',
    nodeIds: ['file:src/app/(workspace)/layout.tsx', 'file:src/app/(workspace)/page.tsx'],
  },
  {
    order: 4,
    title: '制造工艺规划',
    description: '规划器页面与流程桥接组件，支持 EBOM 树与工序编辑。',
    nodeIds: ['file:src/app/(workspace)/planner/page.tsx', 'file:src/components/planner/planner-flow-bridge.tsx'],
  },
  {
    order: 5,
    title: '领域服务',
    description: '领域服务层封装资源、文档、更改与导出等业务操作。',
    nodeIds: ['file:src/lib/domain/services/resource-service.ts', 'file:src/lib/domain/services/process-document-service.ts'],
  },
  {
    order: 6,
    title: '本地数据持久化',
    description: 'Dexie IndexedDB 与种子数据初始化，支撑离线演示。',
    nodeIds: ['file:src/lib/db/index.ts', 'file:src/lib/db/seed.ts'],
  },
  {
    order: 7,
    title: '设计规格',
    description: 'P0 设计规格文档记录模块边界与实施范围。',
    nodeIds: ['document:docs/superpowers/specs/2026-06-23-mpms-p0-foundation-design.md'],
  },
].filter((step) => step.nodeIds.every((id) => graph.nodes.some((n) => n.id === id)))

const nodeSet = new Set(graph.nodes.map((n) => n.id))
const finalLayers = layers.map((l) => ({
  ...l,
  nodeIds: l.nodeIds.filter((id) => nodeSet.has(id)),
}))

const finalTour = tour.map((s) => ({
  ...s,
  nodeIds: s.nodeIds.filter((id) => nodeSet.has(id)),
}))

fs.writeFileSync(path.join(root, '.understand-anything/intermediate/layers.json'), JSON.stringify(finalLayers, null, 2))
fs.writeFileSync(path.join(root, '.understand-anything/intermediate/tour.json'), JSON.stringify(finalTour, null, 2))
console.log('Layers:', finalLayers.length, 'Tour steps:', finalTour.length)
