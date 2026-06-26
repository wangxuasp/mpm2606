'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PitemGrid } from '@/components/pitem/pitem-grid'
import { useEbomCount } from '@/hooks/use-bom-nodes'
import { useCollaborations } from '@/hooks/use-collaboration'
import { useDictionaries } from '@/hooks/use-dictionaries'
import { useAppMeta } from '@/hooks/use-app-meta'
import { usePitems } from '@/hooks/use-pitems'

export default function DashboardPage() {
  const { data: ebomCount = 0 } = useEbomCount()
  const { data: collaborations = [] } = useCollaborations()
  const { data: dictionaries = [] } = useDictionaries()
  const { data: appMeta } = useAppMeta()
  const {
    data: pitems = [],
    isLoading: pitemsLoading,
    isError: pitemsError,
    error: pitemsFetchError,
    refetch: refetchPitems,
  } = usePitems()

  const cards = [
    { title: 'EBOM 节点数', value: ebomCount },
    { title: '协同关联数', value: collaborations.length },
    { title: '字典条目数', value: dictionaries.length },
    { title: 'PITEM 条目数', value: pitemsLoading ? '…' : pitems.length },
    { title: '系统版本', value: appMeta?.version ?? '11.0.0-p0' },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">工作台</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="flex min-h-[420px] flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-medium">PITEM 数据</CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetchPitems()}>
            刷新
          </Button>
        </CardHeader>
        <CardContent className="flex-1 pb-4">
          {pitemsLoading ? (
            <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
              加载 PITEM 数据...
            </div>
          ) : pitemsError ? (
            <div className="flex h-[360px] flex-col items-center justify-center gap-3 text-sm text-destructive">
              <p>{pitemsFetchError instanceof Error ? pitemsFetchError.message : '加载失败'}</p>
              <Button variant="outline" size="sm" onClick={() => refetchPitems()}>
                重试
              </Button>
            </div>
          ) : (
            <div className="h-[360px]">
              <PitemGrid rowData={pitems} />
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Link href="/planner">
          <Button>制造工艺规划器</Button>
        </Link>
        <Link href="/settings">
          <Button variant="outline">设置</Button>
        </Link>
      </div>
    </div>
  )
}
