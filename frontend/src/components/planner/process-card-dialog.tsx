'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { MpmTreeResponse } from '@/lib/domain/types'

export function ProcessCardDialog({
  open,
  onOpenChange,
  tree,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tree: MpmTreeResponse | null | undefined
}) {
  if (!tree) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>机械制造工艺过程卡预览</DialogTitle>
          <DialogDescription>按当前工艺路线生成打印预览</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[68vh] rounded border border-border bg-white text-black">
          <div className="process-card-print min-w-[760px] p-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold">机械制造工艺过程卡</h1>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-x-6 gap-y-2 border border-black p-3 text-sm">
              <span>产品/工艺代号：{tree.root.code || '—'}</span>
              <span>名称：{tree.root.name || '—'}</span>
              <span>版本：{tree.root.revision || '—'}</span>
              <span>责任人：{tree.root.ownerName || tree.root.owner || '—'}</span>
            </div>
            <table className="mt-4 w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1.5 text-left">工序号</th>
                  <th className="border border-black px-2 py-1.5 text-left">代号</th>
                  <th className="border border-black px-2 py-1.5 text-left">名称</th>
                  <th className="border border-black px-2 py-1.5 text-left">类型</th>
                  <th className="border border-black px-2 py-1.5 text-right">数量</th>
                </tr>
              </thead>
              <tbody>
                {tree.nodes.map((node) => (
                  <tr key={node.id}>
                    <td className="border border-black px-2 py-1.5">
                      {node.sequenceNo || '—'}
                    </td>
                    <td className="border border-black px-2 py-1.5">{node.code || '—'}</td>
                    <td className="border border-black px-2 py-1.5">{node.name || '—'}</td>
                    <td className="border border-black px-2 py-1.5">{node.objectType || '—'}</td>
                    <td className="border border-black px-2 py-1.5 text-right">
                      {node.quantity ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-5 grid grid-cols-3 gap-6 text-sm">
              <span>编制：________________</span>
              <span>审核：________________</span>
              <span>批准/日期：____________</span>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          <Button type="button" onClick={() => window.print()}>
            <Printer className="size-4" />
            打印 / 导出 PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
