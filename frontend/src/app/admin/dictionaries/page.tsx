'use client'

import { useMemo, useState } from 'react'
import { useDictionaries } from '@/hooks/use-dictionaries'
import type { DictionaryCategory } from '@/lib/domain/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const CATEGORY_LABELS: Record<DictionaryCategory, string> = {
  'assembly-location': '装配地点',
  'system-name': '系统名称',
}

type FilterTab = 'all' | DictionaryCategory

export default function AdminDictionariesPage() {
  const { data: dictionaries = [], isLoading } = useDictionaries()
  const [tab, setTab] = useState<FilterTab>('all')

  const filtered = useMemo(() => {
    if (tab === 'all') return dictionaries
    return dictionaries.filter((d) => d.category === tab)
  }, [dictionaries, tab])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">字典管理</h1>
        <p className="text-sm text-muted-foreground">
          只读展示种子字典数据（共 {dictionaries.length} 条）
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="assembly-location">装配地点</TabsTrigger>
          <TabsTrigger value="system-name">系统名称</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">加载中...</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>分类</TableHead>
                    <TableHead>编码</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead className="text-right">排序</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{CATEGORY_LABELS[entry.category]}</TableCell>
                      <TableCell>{entry.code}</TableCell>
                      <TableCell>{entry.label}</TableCell>
                      <TableCell className="text-right">{entry.sortOrder}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
