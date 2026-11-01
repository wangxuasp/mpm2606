'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search, UserRound } from 'lucide-react'
import { useOrgTree } from '@/hooks/use-org'
import type { OrgNode } from '@/lib/api/org-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface OrganizationUserPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (userPuid: string, label: string) => void
  title?: string
  description?: string
}

interface FlatUser {
  puid: string
  label: string
  path: string
}

function flattenUsers(node: OrgNode, path: string[] = []): FlatUser[] {
  const nextPath = node.type === 'user' ? path : [...path, node.label]
  const own =
    node.type === 'user' && node.userPuid
      ? [{ puid: node.userPuid, label: node.label, path: path.join(' / ') }]
      : []
  return [...own, ...node.children.flatMap((child) => flattenUsers(child, nextPath))]
}

export function OrganizationUserPicker({
  open,
  onOpenChange,
  onSelect,
  title = '选择用户',
  description = '按组织结构选择任务负责人',
}: OrganizationUserPickerProps) {
  const tree = useOrgTree()
  const [keyword, setKeyword] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const roots = useMemo(() => tree.data?.roots ?? [], [tree.data])
  const allUsers = useMemo(
    () => roots.flatMap((node) => flattenUsers(node)),
    [roots],
  )
  const query = keyword.trim().toLowerCase()
  const matchingUsers = useMemo(() => {
    if (!query) return []
    return allUsers.filter(
      (user) =>
        user.label.toLowerCase().includes(query) ||
        user.path.toLowerCase().includes(query) ||
        user.puid.toLowerCase().includes(query),
    )
  }, [allUsers, query])

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const renderNode = (node: OrgNode, level: number) => {
    const isUser = node.type === 'user'
    const hasChildren = node.children.length > 0
    const isOpen = expanded[node.id] ?? Object.keys(expanded).length === 0
    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/60"
          style={{ paddingLeft: `${level * 14 + 4}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(node.id)}
              className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
              aria-label={isOpen ? '折叠' : '展开'}
            >
              {isOpen ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </button>
          ) : (
            <span className="size-5 shrink-0" />
          )}
          {isUser ? (
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs"
              onClick={() => {
                if (node.userPuid) {
                  onSelect(node.userPuid, node.label)
                  onOpenChange(false)
                }
              }}
            >
              <UserRound className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{node.label}</span>
            </button>
          ) : (
            <span className="truncate text-xs font-medium">{node.label}</span>
          )}
        </div>
        {hasChildren && isOpen
          ? node.children.map((child) => renderNode(child, level + 1))
          : null}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="输入用户 ID 或用户名称"
            className="pl-8"
          />
        </div>
        <ScrollArea className="h-[360px] rounded border border-border">
          <div className="p-2">
            {tree.isLoading ? (
              <p className="p-3 text-xs text-muted-foreground">正在加载组织结构...</p>
            ) : tree.isError ? (
              <p className="p-3 text-xs text-destructive">
                {tree.error instanceof Error ? tree.error.message : '加载组织结构失败'}
              </p>
            ) : query ? (
              matchingUsers.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">没有匹配的用户</p>
              ) : (
                <div className="space-y-1">
                  {matchingUsers.map((user) => (
                    <Button
                      key={`${user.puid}-${user.path}`}
                      type="button"
                      variant="ghost"
                      className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-left"
                      onClick={() => {
                        onSelect(user.puid, user.label)
                        onOpenChange(false)
                      }}
                    >
                      <UserRound className="size-4 shrink-0 text-primary" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium">{user.label}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {user.path || '组织'}
                        </span>
                      </span>
                    </Button>
                  ))}
                </div>
              )
            ) : roots.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">暂无组织数据</p>
            ) : (
              roots.map((root) => {
                const effective = expanded[root.id] ?? Object.keys(expanded).length === 0
                return (
                  <div key={root.id}>
                    <div className="flex items-center gap-1 px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() => toggle(root.id)}
                        className="flex size-5 items-center justify-center text-muted-foreground"
                      >
                        {effective ? (
                          <ChevronDown className="size-3.5" />
                        ) : (
                          <ChevronRight className="size-3.5" />
                        )}
                      </button>
                      <Badge variant="outline" className="text-[10px]">
                        {root.label}
                      </Badge>
                    </div>
                    {effective ? root.children.map((node) => renderNode(node, 1)) : null}
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
