'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  pushToErp,
  pushToMes,
  syncEbomFromTeamcenter,
  validateProductionPush,
} from '@/lib/integration/integration-service'
import { useIntegrationStore } from '@/stores/integration-store'

export interface IntegrationPushPanelProps {
  collaborationId: string
  productCode: string
}

export function IntegrationPushPanel({ collaborationId, productCode }: IntegrationPushPanelProps) {
  const addLog = useIntegrationStore((s) => s.addLog)
  const [busy, setBusy] = useState<string | null>(null)
  const [validation, setValidation] = useState<Awaited<ReturnType<typeof validateProductionPush>> | null>(
    null,
  )

  async function runValidate() {
    const result = await validateProductionPush(collaborationId)
    setValidation(result)
    if (result.ok) {
      toast.success('投产推送前置检查通过')
    } else {
      toast.error(result.errors.join('；'))
    }
  }

  async function handleErpPush() {
    setBusy('erp')
    try {
      const result = await pushToErp(collaborationId, productCode, addLog)
      if (result.status === 'success') toast.success(result.message)
      else toast.error(result.message)
    } finally {
      setBusy(null)
    }
  }

  async function handleMesPush() {
    setBusy('mes')
    try {
      const result = await pushToMes(collaborationId, addLog)
      if (result.status === 'success') toast.success(result.message)
      else toast.error(result.message)
    } finally {
      setBusy(null)
    }
  }

  async function handleTcSync() {
    setBusy('tc')
    try {
      const result = await syncEbomFromTeamcenter(collaborationId, addLog)
      if (result.status === 'success') toast.success(result.message)
      else toast.error(result.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>投产推送</CardTitle>
        <CardDescription>
          MBOM 及工艺路线须为受控（released）状态方可推送 ERP/MES；Teamcenter 可独立同步 EBOM。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {validation && !validation.ok && (
          <Alert variant="destructive">
            <AlertTitle>前置检查未通过</AlertTitle>
            <AlertDescription>{validation.errors.join('；')}</AlertDescription>
          </Alert>
        )}
        {validation?.warnings.length ? (
          <Alert>
            <AlertTitle>提示</AlertTitle>
            <AlertDescription>{validation.warnings.join('；')}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={runValidate} disabled={!!busy}>
            检查投产条件
          </Button>
          <Button type="button" onClick={handleErpPush} disabled={busy === 'erp'}>
            {busy === 'erp' ? '推送中…' : '推送 ERP（材料/工时）'}
          </Button>
          <Button type="button" onClick={handleMesPush} disabled={busy === 'mes'}>
            {busy === 'mes' ? '推送中…' : '推送 MES（路线/APD）'}
          </Button>
          <Button type="button" variant="secondary" onClick={handleTcSync} disabled={busy === 'tc'}>
            {busy === 'tc' ? '同步中…' : '同步 Teamcenter EBOM'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
