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
  node,
  allNodes,
  selectedId,
  onSelect,
  depth = 0,
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
          <span
            onClick={(e) => {
              e.stopPropagation()
              setOpen(!open)
            }}
          >
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}
        <span className="truncate">
          {node.code} — {node.name}
        </span>
      </button>
      {open &&
        children.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            allNodes={allNodes}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
    </div>
  )
}

export function EbomReadonlyTree({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: BomNode[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const roots = buildTree(nodes, null)
  return (
    <ScrollArea className="h-[calc(100vh-12rem)] rounded-md border p-2">
      {roots.map((root) => (
        <TreeNode
          key={root.id}
          node={root}
          allNodes={nodes}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </ScrollArea>
  )
}
