'use client'

import { Fragment, useMemo, useState } from 'react'
import {
  CircleDot,
  Flag,
  GitBranch,
  Handshake,
  Layers,
  Star,
  UserCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useWorkflowGraph, useWorkflowTemplates } from '@/hooks/use-workflow'
import type { WorkflowNode } from '@/lib/api/workflow-client'
import { useWorkflowCanvas, useWorkflowJobs } from '@/hooks/use-workflow'
import type { WorkflowRuntimeNode } from '@/lib/api/workflow-client'

function nodeIcon(typeLabel: string) {
  if (typeLabel.includes('Review')) return <UserCheck className="size-5 text-[#3b6ea5]" />
  if (typeLabel.includes('Do Task')) return <Star className="size-5 text-[#c9a227]" />
  if (typeLabel.includes('Signoff')) return <Handshake className="size-5 text-[#5a7a3f]" />
  if (typeLabel.includes('Add Status')) return <Layers className="size-5 text-[#7a5aa5]" />
  return <CircleDot className="size-5 text-[#555]" />
}

function NodeCard({
  label,
  typeLabel,
  selected,
  variant,
  onClick,
}: {
  label: string
  typeLabel?: string
  selected?: boolean
  variant?: 'start' | 'end' | 'node'
  onClick?: () => void
}) {
  const isStart = variant === 'start'
  const isEnd = variant === 'end'
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-32 shrink-0 border border-black/50 text-left shadow-[2px_2px_3px_rgba(0,0,0,0.25)]',
        selected && 'outline outline-2 outline-[#1f5fbf]',
      )}
    >
      <div className={cn('h-4', isStart ? 'bg-[#2f7d2f]' : 'bg-[#808080]')} />
      <div
        className={cn(
          'flex h-12 items-center justify-center',
          isStart ? 'bg-[#5ceb5c]' : isEnd ? 'bg-white' : 'bg-[#e4e4e4]',
        )}
      >
        {isStart ? (
          <Handshake className="size-5 text-[#14532d]" />
        ) : isEnd ? (
          <Flag className="size-5 text-black" />
        ) : (
          nodeIcon(typeLabel ?? '')
        )}
      </div>
      <div className="min-h-[34px] break-all bg-white px-1 py-1 text-center text-[11px] leading-tight">
        {label}
      </div>
    </button>
  )
}

function Arrow() {
  return (
    <svg width="44" height="96" viewBox="0 0 44 96" className="shrink-0" aria-hidden>
      <line
        x1="2"
        y1="30"
        x2="34"
        y2="30"
        stroke="#5a5a5a"
        strokeWidth="1.5"
        markerEnd="url(#wf-arrow)"
      />
    </svg>
  )
}

function ArrowDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        <marker id="wf-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="#5a5a5a" />
        </marker>
      </defs>
    </svg>
  )
}

function TemplateViewer() {
  const [classification, setClassification] = useState<0 | 1>(0)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const templates = useWorkflowTemplates(classification)
  const activePuid = selectedTemplate ?? templates.data?.[0]?.puid ?? null
  const graph = useWorkflowGraph(activePuid)

  const switchClassification = (next: 0 | 1) => {
    setClassification(next)
    setSelectedTemplate(null)
    setSelectedNode(null)
  }

  const pickTemplate = (puid: string) => {
    setSelectedTemplate(puid)
    setSelectedNode(null)
  }

  const columns = useMemo(() => {
    if (!graph.data) return [] as Array<[number, WorkflowNode[]]>
    const byLevel = new Map<number, WorkflowNode[]>()
    for (const node of graph.data.nodes) {
      if (node.level === 0) continue
      const list = byLevel.get(node.level) ?? []
      list.push(node)
      byLevel.set(node.level, list)
    }
    return [...byLevel.entries()].sort((a, b) => a[0] - b[0])
  }, [graph.data])

  const activeNode = useMemo(() => {
    if (!graph.data) return null
    if (selectedNode) {
      return graph.data.nodes.find((n) => n.puid === selectedNode) ?? graph.data.root
    }
    return graph.data.root
  }, [graph.data, selectedNode])

  const currentTemplate =
    templates.data?.find((t) => t.puid === activePuid) ?? templates.data?.[0] ?? null

  return (
    <div className="flex h-full flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_1fr]">
        <div className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <span className="text-xs text-muted-foreground">模板类型</span>
            <div className="flex overflow-hidden rounded border border-border">
              <Button
                type="button"
                size="sm"
                variant={classification === 0 ? 'default' : 'ghost'}
                className="h-6 rounded-none px-2 text-xs"
                onClick={() => switchClassification(0)}
              >
                流程
              </Button>
              <Button
                type="button"
                size="sm"
                variant={classification === 1 ? 'default' : 'ghost'}
                className="h-6 rounded-none px-2 text-xs"
                onClick={() => switchClassification(1)}
              >
                任务
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-medium">
            <GitBranch className="size-3.5 text-muted-foreground" />
            {classification === 0 ? '流程模板' : '任务模板'}
            {templates.data ? (
              <span className="text-muted-foreground">({templates.data.length})</span>
            ) : null}
          </div>

          <div className="min-h-[180px] flex-1 overflow-auto py-1">
            {templates.isLoading ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">正在加载...</p>
            ) : templates.isError ? (
              <p className="px-3 py-2 text-xs text-destructive">
                {templates.error instanceof Error ? templates.error.message : '加载失败'}
              </p>
            ) : (templates.data ?? []).length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">没有模板</p>
            ) : (
              (templates.data ?? []).map((template) => (
                <button
                  key={template.puid}
                  type="button"
                  onClick={() => pickTemplate(template.puid)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted/60',
                    template.puid === activePuid && 'bg-muted',
                  )}
                >
                  <Star className="size-3.5 shrink-0 text-[#c9a227]" />
                  <span className="truncate">{template.name}</span>
                  {template.variantCount > 1 ? (
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      ×{template.variantCount}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-border">
            <div className="border-b border-border px-3 py-2 text-xs font-medium">属性</div>
            <dl className="space-y-2 px-3 py-2 text-xs">
              <div>
                <dt className="text-muted-foreground">名称</dt>
                <dd className="break-all">{activeNode?.name ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">节点类型</dt>
                <dd>
                  {activeNode?.typeLabel ? (
                    <Badge variant="outline" className="font-normal">
                      {activeNode.typeLabel}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">模板分类</dt>
                <dd>{activeNode ? (activeNode.classification === 0 ? '流程' : '任务') : '-'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">PUID</dt>
                <dd className="break-all font-mono text-[10px]">{activeNode?.puid ?? '-'}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-xs">
            <span className="text-muted-foreground">流程模板</span>
            <span className="font-medium">{currentTemplate?.name ?? '-'}</span>
            {graph.data ? (
              <span className="text-muted-foreground">
                节点 {graph.data.nodes.length} 个 · 连线 {graph.data.edges.length} 条
              </span>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-[#d9e7f8] p-6">
            {graph.isLoading ? (
              <p className="text-sm text-muted-foreground">正在加载流程图...</p>
            ) : graph.isError ? (
              <p className="text-sm text-destructive">
                {graph.error instanceof Error ? graph.error.message : '加载失败'}
              </p>
            ) : !graph.data ? (
              <p className="text-sm text-muted-foreground">请选择左侧的流程模板</p>
            ) : (
              <div className="flex items-start">
                <NodeCard label="开始" variant="start" />
                <Arrow />
                {columns.map(([level, nodes]) => (
                  <Fragment key={level}>
                    <div className="flex flex-col gap-4">
                      {nodes.map((node) => (
                        <NodeCard
                          key={node.puid}
                          label={node.name}
                          typeLabel={node.typeLabel}
                          variant="node"
                          selected={node.puid === (selectedNode ?? graph.data?.root.puid)}
                          onClick={() => setSelectedNode(node.puid)}
                        />
                      ))}
                    </div>
                    <Arrow />
                  </Fragment>
                ))}
                <NodeCard label="完成" variant="end" />
              </div>
            )}
          </div>

          <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
            开始与完成为 Teamcenter 界面虚拟节点，数据库中不存在；
            节点顺序取自模板依赖表，同时点击节点可在左侧查看属性。
          </div>
        </div>
      </div>
    </div>
  )
}

const STATE_STYLES: Record<
  WorkflowRuntimeNode['state'],
  { header: string; body: string; label: string }
> = {
  COMPLETED: { header: 'bg-[#2f7d2f]', body: 'bg-[#5ceb5c]', label: '已完成' },
  ACTIVE: { header: 'bg-[#8a5a12]', body: 'bg-[#f5c451]', label: '进行中' },
  REJECTED: { header: 'bg-[#8a2020]', body: 'bg-[#f3b0b0]', label: '已驳回' },
  WAITING: { header: 'bg-[#808080]', body: 'bg-[#e4e4e4]', label: '待处理' },
}

function RuntimeNodeCard({
  node,
  selected,
  onClick,
}: {
  node: WorkflowRuntimeNode
  selected: boolean
  onClick: () => void
}) {
  const style = STATE_STYLES[node.state] ?? STATE_STYLES.WAITING
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${node.name} · ${node.stateLabel} · ${node.responsibleName || '未指派'}`}
      className={cn(
        'w-36 shrink-0 border border-black/50 text-left shadow-[2px_2px_3px_rgba(0,0,0,0.25)]',
        selected && 'outline outline-2 outline-[#1f5fbf]',
      )}
    >
      <div className={cn('h-4', style.header)} />
      <div className={cn('flex h-10 items-center justify-center', style.body)}>
        {nodeIcon(node.typeLabel)}
      </div>
      <div className="min-h-[34px] break-all bg-white px-1 py-1 text-center text-[11px] leading-tight">
        {node.name}
      </div>
      <div className="flex items-center justify-between border-t border-black/20 bg-white px-1 py-0.5 text-[10px] text-muted-foreground">
        <span className="truncate">{style.label}</span>
        <span className="truncate">{node.responsibleName || '—'}</span>
      </div>
    </button>
  )
}

const JOB_FILTERS = [
  { key: '', label: '全部' },
  { key: 'ACTIVE', label: '进行中' },
  { key: 'COMPLETED', label: '已完成' },
] as const

function RuntimeViewer() {
  const [stateFilter, setStateFilter] = useState<'' | 'ACTIVE' | 'COMPLETED'>('')
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)

  const jobs = useWorkflowJobs(stateFilter || undefined)
  const activeJobPuid = selectedJob ?? jobs.data?.[0]?.jobPuid ?? null
  const canvas = useWorkflowCanvas(activeJobPuid)

  const nodes = useMemo(() => canvas.data?.nodes ?? [], [canvas.data])
  const activeNode = useMemo(
    () => nodes.find((node) => node.taskPuid === selectedTask) ?? nodes[0] ?? null,
    [nodes, selectedTask],
  )

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_1fr]">
      <div className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <div className="flex overflow-hidden rounded border border-border">
            {JOB_FILTERS.map((item) => (
              <button
                key={item.key || 'all'}
                type="button"
                onClick={() => {
                  setStateFilter(item.key)
                  setSelectedJob(null)
                  setSelectedTask(null)
                }}
                className={cn(
                  'px-2.5 py-1 text-xs',
                  stateFilter === item.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto h-6 px-2 text-xs"
            onClick={() => void jobs.refetch()}
          >
            刷新
          </Button>
        </div>

        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-medium">
          <GitBranch className="size-3.5 text-muted-foreground" />
          运行实例
          {jobs.data ? <span className="text-muted-foreground">({jobs.data.length})</span> : null}
        </div>

        <div className="min-h-[180px] flex-1 overflow-auto py-1">
          {jobs.isLoading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">正在加载...</p>
          ) : jobs.isError ? (
            <p className="px-3 py-2 text-xs text-destructive">
              {jobs.error instanceof Error ? jobs.error.message : '加载失败'}
            </p>
          ) : (jobs.data ?? []).length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              没有运行实例。可在工作列表发起流程后回到这里查看。
            </p>
          ) : (
            (jobs.data ?? []).map((job) => (
              <button
                key={job.jobPuid}
                type="button"
                onClick={() => {
                  setSelectedJob(job.jobPuid)
                  setSelectedTask(null)
                }}
                className={cn(
                  'flex w-full flex-col gap-0.5 border-b border-border/50 px-3 py-1.5 text-left text-xs hover:bg-muted/60',
                  job.jobPuid === activeJobPuid && 'bg-muted',
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      job.processState === 'COMPLETED' ? 'bg-[#2f7d2f]' : 'bg-[#d69a1e]',
                    )}
                  />
                  <span className="truncate font-medium">{job.targetCode ?? job.name}</span>
                </span>
                <span className="truncate pl-4 text-[10px] text-muted-foreground">
                  {job.templateName} · {job.completedCount}/{job.taskCount} 已完成
                </span>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-border">
          <div className="border-b border-border px-3 py-2 text-xs font-medium">任务属性</div>
          <dl className="space-y-2 px-3 py-2 text-xs">
            <div>
              <dt className="text-muted-foreground">任务名</dt>
              <dd className="break-all">{activeNode?.name ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">节点类型</dt>
              <dd>
                {activeNode?.typeLabel ? (
                  <Badge variant="outline" className="font-normal">
                    {activeNode.typeLabel}
                  </Badge>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">状态</dt>
              <dd>{activeNode ? activeNode.stateLabel : '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">责任人</dt>
              <dd className="break-all">{activeNode?.responsibleName || '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">签批意见</dt>
              <dd className="break-all whitespace-pre-wrap">{activeNode?.comments || '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">开始 / 完成</dt>
              <dd className="break-all text-[10px]">
                {activeNode?.startDate ?? '-'} → {activeNode?.endDate ?? '-'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-xs">
          <span className="text-muted-foreground">流程实例</span>
          <span className="font-medium">{canvas.data?.job.name ?? '-'}</span>
          {canvas.data ? (
            <span className="text-muted-foreground">
              节点 {canvas.data.nodes.length} 个 · 连线 {canvas.data.edges.length} 条
            </span>
          ) : null}
          {canvas.data ? (
            <Badge
              variant={canvas.data.job.processState === 'COMPLETED' ? 'secondary' : 'outline'}
              className="ml-auto font-normal"
            >
              {canvas.data.job.processState === 'COMPLETED' ? '已完成' : '进行中'}
            </Badge>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[#d9e7f8] p-6">
          {canvas.isLoading ? (
            <p className="text-sm text-muted-foreground">正在加载流程运行态...</p>
          ) : canvas.isError ? (
            <p className="text-sm text-destructive">
              {canvas.error instanceof Error ? canvas.error.message : '加载失败'}
            </p>
          ) : !canvas.data ? (
            <p className="text-sm text-muted-foreground">请选择左侧的流程实例</p>
          ) : (
            <div className="flex items-start">
              <NodeCard label="开始" variant="start" />
              <Arrow />
              <div className="flex flex-col gap-4">
                {nodes.map((node) => (
                  <RuntimeNodeCard
                    key={node.taskPuid}
                    node={node}
                    selected={node.taskPuid === activeNode?.taskPuid}
                    onClick={() => setSelectedTask(node.taskPuid)}
                  />
                ))}
              </div>
              <Arrow />
              <NodeCard label="完成" variant="end" />
            </div>
          )}
        </div>

        <div className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          绿色=已完成、橙色=进行中、灰色=待处理、红色=已驳回；
          节点按任务依赖顺序排列，与工作列表的执行/审批动作同源。
        </div>
      </div>
    </div>
  )
}

export default function WorkflowPage() {
  const [source, setSource] = useState<'template' | 'runtime'>('template')
  return (
    <div className="flex h-full flex-col">
      <ArrowDefs />
      <PageHeader
        title="工作流程查看器"
        description="流程模板结构、运行态节点高亮与责任签批信息"
        actions={
          <div className="flex overflow-hidden rounded border border-border">
            <Button
              type="button"
              size="sm"
              variant={source === 'template' ? 'default' : 'ghost'}
              className="rounded-none"
              onClick={() => setSource('template')}
            >
              模板
            </Button>
            <Button
              type="button"
              size="sm"
              variant={source === 'runtime' ? 'default' : 'ghost'}
              className="rounded-none"
              onClick={() => setSource('runtime')}
            >
              运行实例
            </Button>
          </div>
        }
      />
      {source === 'template' ? <TemplateViewer /> : <RuntimeViewer />}
    </div>
  )
}
