'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { listTemplates } from '@/lib/workflow/templates'

export default function AdminWorkflowTemplatesPage() {
  const templates = listTemplates()

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="border-b pb-4">
        <h1 className="text-xl font-semibold">审批流程模板</h1>
        <p className="text-sm text-muted-foreground">
          系统预置的 7 套审批流程模板（只读）
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">模板 ID</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>审批节点</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-mono text-xs">{template.id}</TableCell>
                <TableCell>{template.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {template.nodes.map((node, i) => (
                      <span key={node.id} className="flex items-center gap-1">
                        <Badge variant={node.terminal ? 'default' : 'outline'}>
                          {node.name}
                        </Badge>
                        {i < template.nodes.length - 1 && (
                          <span className="text-muted-foreground">→</span>
                        )}
                      </span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
