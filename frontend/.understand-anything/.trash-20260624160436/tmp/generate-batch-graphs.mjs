import fs from 'fs'
import path from 'path'

const root = process.argv[2]
const batchesPath = path.join(root, '.understand-anything/intermediate/batches.json')
const batches = JSON.parse(fs.readFileSync(batchesPath, 'utf8'))

function nodeTypeFor(category, filePath) {
  if (category === 'config') return 'config'
  if (category === 'docs') return 'document'
  if (category === 'infra') {
    if (filePath.includes('workflow') || filePath.includes('gitlab-ci') || filePath.includes('Jenkinsfile'))
      return 'pipeline'
    if (filePath.endsWith('.tf')) return 'resource'
    return 'service'
  }
  if (category === 'data') {
    if (filePath.endsWith('.sql')) return 'table'
    if (filePath.match(/\.(graphql|proto|prisma)$/)) return 'schema'
    return 'schema'
  }
  return 'file'
}

function prefixForType(type) {
  const map = {
    file: 'file',
    config: 'config',
    document: 'document',
    service: 'service',
    pipeline: 'pipeline',
    resource: 'resource',
    table: 'table',
    schema: 'schema',
    endpoint: 'endpoint',
  }
  return map[type] || 'file'
}

function complexity(nonEmpty) {
  if (nonEmpty < 50) return 'simple'
  if (nonEmpty <= 200) return 'moderate'
  return 'complex'
}

function summarizeZh(filePath, category, result) {
  const base = path.basename(filePath)
  if (category === 'docs') return `项目文档 ${base}，说明系统设计与使用方式。`
  if (category === 'config') return `配置文件 ${base}，控制构建、编译或运行时行为。`
  if (category === 'data') return `数据/种子文件 ${base}，提供演示或静态数据结构。`
  if (filePath.includes('/api/')) return `Next.js API 路由 ${base}，处理 HTTP 请求与集成逻辑。`
  if (filePath.includes('/app/') && base === 'page.tsx')
    return `Next.js 页面组件，渲染工作台或管理模块的 UI 与交互。`
  if (filePath.includes('/app/') && base === 'layout.tsx')
    return `Next.js 布局组件，定义路由段的共享外壳与 Provider。`
  if (filePath.includes('/components/')) return `React 组件 ${base}，封装可复用 UI 或业务片段。`
  if (filePath.includes('/hooks/')) return `React Hook ${base}，封装数据获取或状态订阅逻辑。`
  if (filePath.includes('/stores/')) return `Zustand 状态仓库 ${base}，管理客户端全局状态。`
  if (filePath.includes('/lib/domain/services/'))
    return `领域服务 ${base}，实现 MPMS 业务规则与数据操作。`
  if (filePath.includes('/lib/domain/types/'))
    return `领域类型定义 ${base}，描述核心业务实体与枚举。`
  if (filePath.includes('/lib/')) return `库模块 ${base}，提供认证、导航或工具能力。`
  if (filePath.includes('.cursor/rules')) return `Cursor 规则文件 ${base}，约束 AI 编码行为。`
  const fn = result?.functions?.[0]?.name
  if (fn) return `源文件 ${base}，导出 ${fn} 等符号并参与模块协作。`
  return `源文件 ${base}，参与 Extech MPMS 前端应用结构。`
}

function tagsFor(filePath, category) {
  const tags = []
  if (category === 'docs') tags.push('documentation')
  if (category === 'config') tags.push('configuration')
  if (filePath.includes('/api/')) tags.push('api-handler')
  if (filePath.includes('/app/')) tags.push('entry-point', 'component')
  if (filePath.includes('/components/')) tags.push('component')
  if (filePath.includes('/hooks/')) tags.push('hook')
  if (filePath.includes('/stores/')) tags.push('service')
  if (filePath.includes('/lib/domain/')) tags.push('data-model')
  if (filePath.includes('test') || filePath.includes('spec')) tags.push('test')
  if (tags.length < 3) tags.push('utility')
  return [...new Set(tags)].slice(0, 5)
}

function isSignificantFn(fn) {
  return (fn.endLine - fn.startLine + 1) >= 10
}

function isSignificantCls(cls) {
  return (cls.methods?.length || 0) >= 2 || cls.endLine - cls.startLine + 1 >= 20
}

for (const batch of batches.batches) {
  const extractPath = path.join(root, `.understand-anything/tmp/ua-file-extract-results-${batch.batchIndex}.json`)
  const extract = JSON.parse(fs.readFileSync(extractPath, 'utf8'))
  const importData = batch.batchImportData || {}
  const nodes = []
  const edges = []
  const seen = new Set()

  const addEdge = (edge) => {
    const key = `${edge.source}|${edge.target}|${edge.type}`
    if (seen.has(key)) return
    seen.add(key)
    edges.push(edge)
  }

  for (const result of extract.results) {
    const fp = result.path
    const category = result.fileCategory || 'code'
    const type = nodeTypeFor(category, fp)
    const prefix = prefixForType(type)
    const fileId = `${prefix}:${fp}`

    nodes.push({
      id: fileId,
      type,
      name: path.basename(fp),
      filePath: fp,
      summary: summarizeZh(fp, category, result),
      tags: tagsFor(fp, category),
      complexity: complexity(result.nonEmptyLines || result.totalLines || 0),
    })

    for (const imp of importData[fp] || []) {
      const impType = nodeTypeFor(
        batch.files.find((f) => f.path === imp)?.fileCategory || 'code',
        imp,
      )
      addEdge({
        source: fileId,
        target: `${prefixForType(impType)}:${imp}`,
        type: 'imports',
        direction: 'forward',
        weight: 0.7,
      })
    }

    for (const fn of result.functions || []) {
      if (!isSignificantFn(fn)) continue
      const fnId = `function:${fp}:${fn.name}`
      nodes.push({
        id: fnId,
        type: 'function',
        name: fn.name,
        filePath: fp,
        summary: `函数 ${fn.name}，位于 ${path.basename(fp)}，处理页面或业务逻辑。`,
        tags: ['utility'],
        complexity: complexity(fn.endLine - fn.startLine + 1),
      })
      addEdge({ source: fileId, target: fnId, type: 'contains', direction: 'forward', weight: 1.0 })
      if ((result.exports || []).some((e) => e.name === fn.name))
        addEdge({ source: fileId, target: fnId, type: 'exports', direction: 'forward', weight: 0.8 })
    }

    for (const cls of result.classes || []) {
      if (!isSignificantCls(cls)) continue
      const clsId = `class:${fp}:${cls.name}`
      nodes.push({
        id: clsId,
        type: 'class',
        name: cls.name,
        filePath: fp,
        summary: `类 ${cls.name}，封装 ${path.basename(fp)} 中的对象行为。`,
        tags: ['data-model'],
        complexity: complexity(cls.endLine - cls.startLine + 1),
      })
      addEdge({ source: fileId, target: clsId, type: 'contains', direction: 'forward', weight: 1.0 })
      if ((result.exports || []).some((e) => e.name === cls.name))
        addEdge({ source: fileId, target: clsId, type: 'exports', direction: 'forward', weight: 0.8 })
    }
  }

  const out = path.join(root, `.understand-anything/intermediate/batch-${batch.batchIndex}.json`)
  fs.writeFileSync(out, JSON.stringify({ nodes, edges }, null, 2))
  console.log(`Wrote batch ${batch.batchIndex}: ${nodes.length} nodes, ${edges.length} edges`)
}
