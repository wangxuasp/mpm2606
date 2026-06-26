'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export interface OnlyOfficeEditorProps {
  documentTitle: string
  onSave?: () => void
  onExport?: () => void
}

/** P4 integration point — OnlyOffice Document Server embed. */
export function OnlyOfficeEditor({
  documentTitle,
  onSave,
  onExport,
}: OnlyOfficeEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{documentTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">OnlyOffice 文档服务器未接入</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onSave}>
          保存
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onExport}>
          导出
        </Button>
      </CardFooter>
    </Card>
  )
}
