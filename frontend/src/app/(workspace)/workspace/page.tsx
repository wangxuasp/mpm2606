'use client'

import { Suspense, useState, type MouseEvent as ReactMouseEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Folder,
  Inbox,
  Play,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { ObjectPropertiesDialog } from '@/components/objects/object-properties-dialog'
import { StartProcessDialog } from '@/components/workspace/start-process-dialog'
import { WorklistTaskActions } from '@/components/workspace/worklist-task-actions'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ContextMenu, ContextMenuItem } from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useFolderContents,
  useMailbox,
  useWorklist,
  useWorkspaceSummary,
} from '@/hooks/use-workspace'
import {
  useOrgFolder,
  useOrgMailbox,
  useOrgWorklist,
  useOrgWorkspaceSummary,
} from '@/hooks/use-org'
import {
  removeFolderItem,
  removeWorklistTask,
  type FolderItem,
  type MailItem,
  type WorklistTask,
} from '@/lib/api/workspace-client'
import { cn } from '@/lib/utils'

function ErrorLine({ message }: { message: string }) {
  return <p className="px-4 py-6 text-sm text-destructive">{message}</p>
}

function EmptyLine({ message }: { message: string }) {
  return <p className="px-4 py-6 text-sm text-muted-foreground">{message}</p>
}

type FolderQuery = {
  isLoading: boolean
  isError: boolean
  error: unknown
  data?: FolderItem[]
}

function WorkspaceInner() {
  const searchParams = useSearchParams()
  const orgViewUser = searchParams.get('orgViewUser')
  const isOrgView = Boolean(orgViewUser)
  const tabParam = searchParams.get('tab')
  const initialTab = ['home', 'newstuff', 'mailbox', 'worklist'].includes(tabParam ?? '')
    ? (tabParam as string)
    : 'home'

  const ownSummary = useWorkspaceSummary()
  const ownHome = useFolderContents('home')
  const ownNewstuff = useFolderContents('newstuff')
  const ownMailbox = useMailbox()
  const ownWorklist = useWorklist()

  const orgSummary = useOrgWorkspaceSummary(orgViewUser)
  const orgHome = useOrgFolder(orgViewUser, 'home')
  const orgNewstuff = useOrgFolder(orgViewUser, 'newstuff')
  const orgMailbox = useOrgMailbox(orgViewUser)
  const orgWorklist = useOrgWorklist(orgViewUser)

  const summary = isOrgView ? orgSummary : ownSummary
  const home = isOrgView ? orgHome : ownHome
  const newstuff = isOrgView ? orgNewstuff : ownNewstuff
  const mailbox = isOrgView ? orgMailbox : ownMailbox
  const worklist = isOrgView ? orgWorklist : ownWorklist

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    TasksToPerform: true,
  })
  const [startOpen, setStartOpen] = useState(false)
  const queryClient = useQueryClient()
  const [mailDetail, setMailDetail] = useState<MailItem | null>(null)
  const [confirmAction, setConfirmAction] = useState<
    | { kind: 'folder'; type: 'home' | 'newstuff'; item: FolderItem }
    | { kind: 'task'; item: WorklistTask }
    | null
  >(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    kind: 'folder' | 'mail' | 'task'
    folderType?: 'home' | 'newstuff'
    item: FolderItem | MailItem | WorklistTask
  } | null>(null)
  const [propertiesTarget, setPropertiesTarget] = useState<{
    puid: string
    label: string
  } | null>(null)

  const invalidateWorkspace = async () => {
    await queryClient.invalidateQueries({ queryKey: ['workspace'] })
    await queryClient.invalidateQueries({ queryKey: ['org'] })
  }

  const openContextMenu = (
    event: ReactMouseEvent,
    kind: 'folder' | 'mail' | 'task',
    item: FolderItem | MailItem | WorklistTask,
    folderType?: 'home' | 'newstuff',
  ) => {
    if (isOrgView && kind !== 'mail') return
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, kind, folderType, item })
  }

  const confirmRemove = async () => {
    if (!confirmAction) return
    try {
      if (confirmAction.kind === 'folder') {
        await removeFolderItem(confirmAction.type, confirmAction.item.puid)
        toast.success('已从文件夹删除')
      } else {
        const result = await removeWorklistTask(confirmAction.item.puid)
        toast.success(result?.message ?? '已从工作列表删除')
      }
      setConfirmAction(null)
      await invalidateWorkspace()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const toggleFolder = (key: string) => {
    setOpenFolders((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const profile = summary.data?.profile
  const subtitle = profile
    ? [profile.userId, profile.department, profile.roles?.join(' / ')]
        .filter((value) => value && String(value).trim())
        .join(' · ')
    : '正在读取当前账号信息'

  const stats = [
    { label: 'Home 对象', value: summary.data?.homeCount },
    { label: 'Newstuff 对象', value: summary.data?.newstuffCount },
    { label: '未读邮件', value: summary.data?.unreadMailCount },
    { label: '待办任务', value: summary.data?.taskCount },
  ]

  const renderFolder = (
    query: FolderQuery,
    emptyText: string,
    folderType: 'home' | 'newstuff',
  ) => {
    if (query.isLoading) return <EmptyLine message="正在加载..." />
    if (query.isError) {
      return <ErrorLine message={query.error instanceof Error ? query.error.message : '加载失败'} />
    }
    const rows = query.data ?? []
    if (rows.length === 0) return <EmptyLine message={emptyText} />
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>名称</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>零组件号</TableHead>
            <TableHead>版本</TableHead>
            <TableHead>所有者</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((item) => (
            <TableRow
              key={item.puid}
              className="cursor-context-menu"
              onContextMenu={(event) => openContextMenu(event, 'folder', item, folderType)}
            >
              <TableCell className="text-muted-foreground">{item.sequence}</TableCell>
              <TableCell className="max-w-[280px] truncate font-medium">{item.name}</TableCell>
              <TableCell>
                <Badge variant={item.folder ? 'secondary' : 'outline'}>{item.objectType || '-'}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{item.itemId || '-'}</TableCell>
              <TableCell className="text-muted-foreground">{item.revision || '-'}</TableCell>
              <TableCell className="text-muted-foreground">{item.ownerName || '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={isOrgView ? '只读查看用户工作区' : '个人工作区'}
        description={subtitle}
        actions={
          !isOrgView ? (
            <Button type="button" size="sm" onClick={() => setStartOpen(true)}>
              <Play className="size-4" />
              发起流程
            </Button>
          ) : null
        }
      />

      {isOrgView ? (
        <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs md:mx-5">
          <Badge variant="outline" className="border-sky-500/40 text-sky-700 dark:text-sky-300">
            只读
          </Badge>
          <span>
            当前通过组织结构图查看账号 <strong>{profile?.displayName ?? orgViewUser}</strong> 的工作区
          </span>
          <Link
            href="/workspace"
            className={cn(buttonVariants({ size: 'sm', variant: 'link' }), 'h-auto px-1')}
          >
            <Undo2 className="size-3.5" />
            返回我的工作区
          </Link>
          <Link
            href="/organization"
            className={cn(buttonVariants({ size: 'sm', variant: 'link' }), 'h-auto px-1')}
          >
            返回组织结构图
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 px-4 py-3 md:grid-cols-4 md:px-5">
        {stats.map((stat) => (
          <Card key={stat.label} className="gap-1 rounded-md p-3">
            <span className="text-xs text-muted-foreground">{stat.label}</span>
            <span className="text-xl font-semibold tabular-nums">
              {stat.value ?? (summary.isLoading ? '...' : '-')}
            </span>
          </Card>
        ))}
      </div>

      {profile ? (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3 text-xs text-muted-foreground md:px-5">
          <span>{profile.personName || profile.displayName}</span>
          {profile.email ? <span>{profile.email}</span> : null}
          {(profile.groups ?? []).slice(0, 3).map((group) => (
            <Badge key={group} variant="secondary" className="font-normal">
              {group}
            </Badge>
          ))}
          {(profile.roles ?? []).map((role) => (
            <Badge key={role} variant="outline" className="font-normal">
              {role}
            </Badge>
          ))}
        </div>
      ) : null}

      {summary.isError ? (
        <ErrorLine
          message={summary.error instanceof Error ? summary.error.message : '获取工作区信息失败'}
        />
      ) : null}

      <Tabs defaultValue={initialTab} className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mb-2 self-start md:mx-5">
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="newstuff">Newstuff</TabsTrigger>
          <TabsTrigger value="mailbox">邮箱</TabsTrigger>
          <TabsTrigger value="worklist">工作列表</TabsTrigger>
        </TabsList>

        <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 md:px-5">
          <TabsContent value="home" className="mt-0">
            <Card className="gap-0 overflow-hidden rounded-md py-0">
              {renderFolder(home, 'Home 文件夹为空', 'home')}
            </Card>
          </TabsContent>

          <TabsContent value="newstuff" className="mt-0">
            <Card className="gap-0 overflow-hidden rounded-md py-0">
              {renderFolder(newstuff, 'Newstuff 文件夹为空', 'newstuff')}
            </Card>
          </TabsContent>

          <TabsContent value="mailbox" className="mt-0">
            <Card className="gap-0 overflow-hidden rounded-md py-0">
              {mailbox.isLoading ? (
                <EmptyLine message="正在加载..." />
              ) : mailbox.isError ? (
                <ErrorLine
                  message={mailbox.error instanceof Error ? mailbox.error.message : '加载失败'}
                />
              ) : (mailbox.data ?? []).length === 0 ? (
                <EmptyLine message="邮箱为空" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>主题</TableHead>
                      <TableHead>发件人</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead className="w-20">状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(mailbox.data ?? []).map((mail) => (
                      <TableRow
                        key={mail.puid}
                        className="cursor-pointer"
                        onClick={() => setMailDetail(mail)}
                        onContextMenu={(event) => openContextMenu(event, 'mail', mail)}
                      >
                        <TableCell className="text-muted-foreground">{mail.sequence}</TableCell>
                        <TableCell className="max-w-[360px] truncate font-medium">
                          {mail.subject}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {mail.senderName || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {mail.sentDate || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={mail.read ? 'secondary' : 'default'}>
                            {mail.read ? '已读' : '未读'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="worklist" className="mt-0">
            <Card className="gap-0 overflow-hidden rounded-md py-0">
              {worklist.isLoading ? (
                <EmptyLine message="正在加载..." />
              ) : worklist.isError ? (
                <ErrorLine
                  message={worklist.error instanceof Error ? worklist.error.message : '加载失败'}
                />
              ) : !worklist.data ? (
                <EmptyLine message="当前账号没有任务收件箱" />
              ) : (
                <div className="text-sm">
                  <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
                    <Inbox className="size-4 text-muted-foreground" />
                    <span className="font-medium">{worklist.data.inboxName}</span>
                  </div>
                  <ul className="py-1">
                    {worklist.data.folders.map((folder) => {
                      const open = Boolean(openFolders[folder.key])
                      return (
                        <li key={folder.key}>
                          <button
                            type="button"
                            onClick={() => toggleFolder(folder.key)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted/50"
                          >
                            {open ? (
                              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                            )}
                            <Folder className="size-4 shrink-0 text-amber-500" />
                            <span>{folder.title}</span>
                            <span className="text-xs text-muted-foreground">({folder.count})</span>
                          </button>

                          {open ? (
                            folder.tasks.length === 0 ? (
                              <p className="py-1 pl-12 text-xs text-muted-foreground">暂无任务</p>
                            ) : (
                              <ul className="ml-5 border-l border-border pl-1">
                                {folder.tasks.map((task) => (
                                  <li
                                    key={task.puid}
                                    className="flex cursor-context-menu flex-wrap items-center gap-2 px-3 py-1.5"
                                    onContextMenu={(event) => openContextMenu(event, 'task', task)}
                                  >
                                    <FileText className="size-4 shrink-0 text-sky-500" />
                                    <span className="font-medium">{task.displayName}</span>
                                    <Badge variant="outline" className="text-[10px] font-normal">
                                      {task.taskType || 'Task'}
                                    </Badge>
                                    {task.state ? (
                                      <span className="text-xs text-muted-foreground">
                                        状态 {task.state}
                                      </span>
                                    ) : null}
                                    {task.targetItemPuid ? (
                                      <Link
                                        href={`/planner?product=${task.targetItemPuid}`}
                                        className="rounded px-1.5 py-0.5 text-[11px] text-primary hover:bg-muted hover:underline"
                                      >
                                        在规划器中打开
                                      </Link>
                                    ) : null}
                                    <WorklistTaskActions
                                      task={task}
                                      canAct={folder.key === 'TasksToPerform'}
                                      readOnly={isOrgView}
                                    />
                                  </li>
                                ))}
                              </ul>
                            )
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <StartProcessDialog open={startOpen} onOpenChange={setStartOpen} />

      <ObjectPropertiesDialog
        open={Boolean(propertiesTarget)}
        onOpenChange={(next) => {
          if (!next) setPropertiesTarget(null)
        }}
        puid={propertiesTarget?.puid ?? null}
        title={propertiesTarget?.label}
      />

      <ContextMenu
        open={Boolean(contextMenu)}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        onOpenChange={(open) => {
          if (!open) setContextMenu(null)
        }}
      >
        {contextMenu ? (
          <ContextMenuItem
            onSelect={() => {
              const label =
                contextMenu.kind === 'mail'
                  ? (contextMenu.item as MailItem).subject
                  : contextMenu.kind === 'task'
                    ? (contextMenu.item as WorklistTask).displayName
                    : (contextMenu.item as FolderItem).name
              setPropertiesTarget({
                puid: contextMenu.item.puid,
                label: label || contextMenu.item.puid,
              })
              setContextMenu(null)
            }}
          >
            <Eye className="size-4" />
            查看属性
          </ContextMenuItem>
        ) : null}
        {contextMenu?.kind === 'mail' ? (
          <ContextMenuItem
            onSelect={() => {
              setMailDetail(contextMenu.item as MailItem)
              setContextMenu(null)
            }}
          >
            <Eye className="size-4" />
            查看内容
          </ContextMenuItem>
        ) : null}
        {contextMenu?.kind === 'folder' && !isOrgView ? (
          <ContextMenuItem
            destructive
            onSelect={() => {
              setConfirmAction({
                kind: 'folder',
                type: contextMenu.folderType ?? 'home',
                item: contextMenu.item as FolderItem,
              })
              setContextMenu(null)
            }}
          >
            <Trash2 className="size-4" />
            删除
          </ContextMenuItem>
        ) : null}
        {contextMenu?.kind === 'task' && !isOrgView ? (
          <ContextMenuItem
            destructive
            onSelect={() => {
              setConfirmAction({
                kind: 'task',
                item: contextMenu.item as WorklistTask,
              })
              setContextMenu(null)
            }}
          >
            <Trash2 className="size-4" />
            删除任务
          </ContextMenuItem>
        ) : null}
      </ContextMenu>

      <Dialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              {confirmAction?.kind === 'folder'
                ? `确定从文件夹删除“${confirmAction.item.name}”吗？对象本身不会被删除。`
                : confirmAction?.kind === 'task'
                  ? `确定从工作列表删除“${confirmAction.item.displayName}”吗？任务和流程历史不会被删除。`
                  : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmAction(null)}>
              取消
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmRemove()}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(mailDetail)}
        onOpenChange={(open) => {
          if (!open) setMailDetail(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{mailDetail?.subject ?? '邮件内容'}</DialogTitle>
            <DialogDescription>
              {[mailDetail?.senderName, mailDetail?.sentDate].filter(Boolean).join(' · ') ||
                '邮件详情'}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-auto whitespace-pre-wrap rounded border border-border bg-muted/20 p-3 text-sm">
            {mailDetail?.body?.trim() || '无正文'}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setMailDetail(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">正在加载工作区...</div>}>
      <WorkspaceInner />
    </Suspense>
  )
}
