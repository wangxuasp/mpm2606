'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChangeOrderWizard } from '@/components/change/change-order-wizard'
import { ChangeSummaryPanel } from '@/components/change/change-summary-panel'

export default function ChangePage() {
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="border-b pb-4">
        <h1 className="text-xl font-semibold">工艺更改</h1>
        <p className="text-sm text-muted-foreground">
          发起工艺更改单向导，查询与导出更改汇总
        </p>
      </div>

      <Tabs defaultValue="wizard" className="min-h-0 flex-1">
        <TabsList>
          <TabsTrigger value="wizard">更改单向导</TabsTrigger>
          <TabsTrigger value="summary">更改汇总</TabsTrigger>
        </TabsList>

        <TabsContent value="wizard" className="mt-4">
          <ChangeOrderWizard />
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <ChangeSummaryPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
