'use client'

import { useQuery } from '@tanstack/react-query'
import { Download, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { IntegrationLogTable } from '@/components/integration/integration-log-table'
import { IntegrationPushPanel } from '@/components/integration/integration-push-panel'
import { IntegrationStatusCard } from '@/components/integration/integration-status-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { downloadJson, exportCollaborationHandoff } from '@/lib/db/export-import'
import { checkIntegrationHealth } from '@/lib/integration/integration-service'
import { isMockIntegration } from '@/lib/integration/config'
import { useIntegrationStore } from '@/stores/integration-store'
import { useWorkspaceStore } from '@/stores/workspace-store'

export default function IntegrationPage() {
  const collaborationId = useWorkspaceStore((s) => s.collaborationId)
  const productCode = useWorkspaceStore((s) => s.productCode)
  const logs = useIntegrationStore((s) => s.logs)
  const clearLogs = useIntegrationStore((s) => s.clearLogs)

  const { data: health } = useQuery({
    queryKey: ['integration-health'],
    queryFn: checkIntegrationHealth,
    staleTime: 60_000,
  })

  async function handleExportHandoff() {
    if (!collaborationId) {
      toast.error('未选择协同项目')
      return
    }
    try {
      const pkg = await exportCollaborationHandoff(collaborationId)
      downloadJson(pkg, `mpms-handoff-${productCode ?? collaborationId}-${Date.now()}.json`)
      toast.success('协同交接数据包已导出')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '导出失败')
    }
  }

  if (!collaborationId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">请在工作台选择协同项目后再进行系统集成操作。</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Link2 className="size-6" />
            系统集成
          </h1>
          <p className="text-sm text-muted-foreground">
            ERP / MES / Teamcenter 接入点预留 — 当前协同 {productCode ?? collaborationId}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{isMockIntegration() ? 'Mock 模式' : 'Live 模式'}</Badge>
          <Badge variant="outline">后端待接入</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <IntegrationStatusCard
          title="ERP"
          description="材料定额、工时推送"
          ok={health?.erp.ok ?? false}
          message={health?.erp.message ?? '检查中…'}
        />
        <IntegrationStatusCard
          title="MES"
          description="工艺路线、工序、APD 下发"
          ok={health?.mes.ok ?? false}
          message={health?.mes.message ?? '检查中…'}
        />
        <IntegrationStatusCard
          title="Teamcenter"
          description="EBOM / JT 数据集同步"
          ok={health?.teamcenter.ok ?? false}
          message={health?.teamcenter.message ?? '检查中…'}
        />
      </div>

      <IntegrationPushPanel collaborationId={collaborationId} productCode={productCode ?? ''} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>后端交接数据包</CardTitle>
            <CardDescription>
              导出当前协同的 MBOM、工艺路线、工序及汇总清单，供后端服务导入
            </CardDescription>
          </div>
          <Button type="button" onClick={handleExportHandoff}>
            <Download className="mr-2 size-4" />
            导出交接包
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>集成操作日志</CardTitle>
            <CardDescription>最近 100 条推送/同步记录（本地持久化）</CardDescription>
          </div>
          {logs.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={clearLogs}>
              清空
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <IntegrationLogTable logs={logs} />
        </CardContent>
      </Card>
    </div>
  )
}
