'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Mail,
  Search,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOrgProfile, useOrgTree } from '@/hooks/use-org'
import type { OrgNode } from '@/lib/api/org-client'
import { cn } from '@/lib/utils'

function firstUser(node: OrgNode): OrgNode | null {
  if (node.type === 'user') return node
  for (const child of node.children) {
    const found = firstUser(child)
    if (found) return found
  }
  return null
}

function filterNode(
  node: OrgNode,
  userKeyword: string,
  roleKeyword: string,
  groupKeyword: string,
): OrgNode | null {
  const children = node.children
    .map((child) => filterNode(child, userKeyword, roleKeyword, groupKeyword))
    .filter((child): child is OrgNode => Boolean(child))

  const ownLabel = node.label.toLowerCase()
  const matches =
    (node.type === 'user' && (!userKeyword || ownLabel.includes(userKeyword))) ||
    (node.type === 'role' && (!roleKeyword || ownLabel.includes(roleKeyword))) ||
    (node.type === 'group' && (!groupKeyword || ownLabel.includes(groupKeyword))) ||
    (!userKeyword && !roleKeyword && !groupKeyword)

  // A matching group/role keeps its descendants; otherwise keep only matching branches.
  if (matches && (groupKeyword || roleKeyword || userKeyword)) {
    if (node.type === 'group' && groupKeyword && ownLabel.includes(groupKeyword)) {
      return node
    }
    if (node.type === 'role' && roleKeyword && ownLabel.includes(roleKeyword)) {
      return node
    }
  }
  if (children.length > 0) return { ...node, children }
  return matches ? node : null
}

function OrgTreeNodeView({
  node,
  level,
  selectedUserPuid,
  expanded,
  onToggle,
  onSelect,
}: {
  node: OrgNode
  level: number
  selectedUserPuid: string | null
  expanded: Record<string, boolean>
  onToggle: (id: string) => void
  onSelect: (node: OrgNode) => void
}) {
  const hasChildren = node.children.length > 0
  const open = expanded[node.id] ?? true
  const selected = node.userPuid === selectedUserPuid
  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded px-1 py-0.5 ${
          selected ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60'
        }`}
        style={{ paddingLeft: `${level * 14 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
            onClick={() => onToggle(node.id)}
            aria-label={open ? '折叠' : '展开'}
          >
            {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : (
          <span className="size-5 shrink-0" />
        )}
        {node.type === 'user' ? (
          <UserRound className="size-3.5 shrink-0 text-primary" />
        ) : node.type === 'role' ? (
          <UsersRound className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        {node.type === 'user' ? (
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-xs"
            onClick={() => onSelect(node)}
          >
            {node.label}
          </button>
        ) : (
          <span className="min-w-0 flex-1 truncate text-xs font-medium">{node.label}</span>
        )}
      </div>
      {hasChildren && open
        ? node.children.map((child) => (
            <OrgTreeNodeView
              key={child.id}
              node={child}
              level={level + 1}
              selectedUserPuid={selectedUserPuid}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  )
}

export default function OrganizationPage() {
  const tree = useOrgTree()
  const [selectedUserPuid, setSelectedUserPuid] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [userKeyword, setUserKeyword] = useState('')
  const [roleKeyword, setRoleKeyword] = useState('')
  const [groupKeyword, setGroupKeyword] = useState('')

  const roots = useMemo(() => tree.data?.roots ?? [], [tree.data])
  const defaultUser = useMemo(() => {
    for (const root of roots) {
      const found = firstUser(root)
      if (found) return found
    }
    return null
  }, [roots])
  const activeUserPuid = selectedUserPuid ?? defaultUser?.userPuid ?? null
  const profile = useOrgProfile(activeUserPuid)

  const filteredRoots = useMemo(() => {
    const filters = [
      userKeyword.trim().toLowerCase(),
      roleKeyword.trim().toLowerCase(),
      groupKeyword.trim().toLowerCase(),
    ]
    if (!filters.some(Boolean)) return roots
    return roots
      .map((root) => filterNode(root, filters[0], filters[1], filters[2]))
      .filter((root): root is OrgNode => Boolean(root))
  }, [roots, userKeyword, roleKeyword, groupKeyword])

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }))
  }

  const selectUser = (node: OrgNode) => {
    if (node.userPuid) setSelectedUserPuid(node.userPuid)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="组织"
        description="组、角色与用户结构；可只读查看目标用户工作区"
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="border-b border-border px-3 py-3">
            <div className="mb-2 flex items-center gap-2">
              <FolderTree className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium">组织结构</span>
              {tree.data ? (
                <span className="text-[10px] text-muted-foreground">
                  {tree.data.roots.length} 个根节点
                </span>
              ) : null}
            </div>
            <div className="space-y-2">
              {[
                ['输入用户 ID 或用户名称', userKeyword, setUserKeyword],
                ['输入角色名称', roleKeyword, setRoleKeyword],
                ['输入组名称', groupKeyword, setGroupKeyword],
              ].map(([placeholder, value, setter]) => (
                <div key={placeholder as string} className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    value={value as string}
                    onChange={(event) => (setter as (value: string) => void)(event.target.value)}
                    placeholder={placeholder as string}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
          <ScrollArea className="min-h-[220px] flex-1">
            <div className="p-2">
              {tree.isLoading ? (
                <p className="p-3 text-xs text-muted-foreground">正在加载组织结构...</p>
              ) : tree.isError ? (
                <p className="p-3 text-xs text-destructive">
                  {tree.error instanceof Error ? tree.error.message : '加载组织结构失败'}
                </p>
              ) : filteredRoots.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">没有匹配的组织节点</p>
              ) : (
                filteredRoots.map((root) => (
                  <OrgTreeNodeView
                    key={root.id}
                    node={root}
                    level={0}
                    selectedUserPuid={activeUserPuid}
                    expanded={expanded}
                    onToggle={toggle}
                    onSelect={selectUser}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        <section className="min-h-0 overflow-auto p-4 md:p-5">
          {!activeUserPuid ? (
            <Card className="flex h-64 items-center justify-center rounded-md text-sm text-muted-foreground">
              请选择组织树中的用户
            </Card>
          ) : profile.isLoading ? (
            <Card className="rounded-md p-4 text-sm text-muted-foreground">正在加载用户档案...</Card>
          ) : profile.isError ? (
            <Card className="rounded-md p-4 text-sm text-destructive">
              {profile.error instanceof Error ? profile.error.message : '加载用户档案失败'}
            </Card>
          ) : profile.data ? (
            <div className="space-y-4">
              <Card className="gap-3 rounded-md p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <UserRound className="size-5 text-primary" />
                      <h2 className="text-base font-semibold">
                        {profile.data.user.displayName}
                      </h2>
                      <Badge variant={profile.data.user.status === 0 ? 'secondary' : 'destructive'}>
                        {profile.data.user.statusLabel}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {profile.data.user.userId} · 默认组 {profile.data.defaultGroupName ?? '-'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/workspace?orgViewUser=${activeUserPuid}&tab=home`}
                      className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}
                    >
                      <FolderTree className="size-4" />
                      查看工作区
                    </Link>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 rounded border border-border bg-muted/20 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">链接</span>
                  <Link className="text-primary hover:underline" href={`/workspace?orgViewUser=${activeUserPuid}&tab=home`}>
                    Home
                  </Link>
                  <Link className="text-primary hover:underline" href={`/workspace?orgViewUser=${activeUserPuid}&tab=mailbox`}>
                    <Mail className="mr-1 inline size-3.5" />
                    邮箱
                  </Link>
                  <Link className="text-primary hover:underline" href={`/workspace?orgViewUser=${activeUserPuid}&tab=newstuff`}>
                    Newstuff
                  </Link>
                  <Link className="text-primary hover:underline" href={`/workspace?orgViewUser=${activeUserPuid}&tab=worklist`}>
                    工作列表
                  </Link>
                </div>
              </Card>

              <Tabs defaultValue="user" className="space-y-3">
                <TabsList>
                  <TabsTrigger value="user">用户</TabsTrigger>
                  <TabsTrigger value="person">人员</TabsTrigger>
                  <TabsTrigger value="member">成员</TabsTrigger>
                </TabsList>
                <TabsContent value="user">
                  <Card className="grid gap-3 rounded-md p-4 text-sm sm:grid-cols-2">
                    {[
                      ['用户名', profile.data.user.displayName],
                      ['用户 ID', profile.data.user.userId],
                      ['操作系统名称', profile.data.user.userId],
                      ['默认组', profile.data.defaultGroupName ?? '-'],
                      ['用户状态', profile.data.user.statusLabel],
                      ['上次登录', profile.data.lastLoginAt ?? '-'],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[110px_1fr] gap-2">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="break-all">{value}</span>
                      </div>
                    ))}
                  </Card>
                </TabsContent>
                <TabsContent value="person">
                  <Card className="grid gap-3 rounded-md p-4 text-sm sm:grid-cols-2">
                    {[
                      ['人员姓名', profile.data.person.name ?? '-'],
                      ['部门/科室', profile.data.person.department ?? '-'],
                      ['电子邮箱', profile.data.person.email ?? '-'],
                      ['联系电话', profile.data.person.phone ?? '-'],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[110px_1fr] gap-2">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="break-all">{value}</span>
                      </div>
                    ))}
                  </Card>
                </TabsContent>
                <TabsContent value="member">
                  <Card className="gap-0 overflow-hidden rounded-md py-0">
                    {profile.data.memberships.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">暂无成员关系</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {profile.data.memberships.map((membership) => (
                          <div
                            key={membership.puid}
                            className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[140px_120px_1fr]"
                          >
                            <div className="font-medium">{membership.groupName}</div>
                            <div>{membership.roleName}</div>
                            <div className="text-xs text-muted-foreground">
                              {membership.roleDescription || '—'}
                              {membership.defaultRole ? ' · 默认角色' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
