'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useDictionariesByCategory } from '@/hooks/use-dictionaries'
import { updateOperation } from '@/lib/domain/services/operation-service'
import type { Operation, ProcessCardStep, ProfessionGroup } from '@/lib/domain/types'

const PROFESSION_LABELS: Record<ProfessionGroup, string> = {
  mechanical: '机械',
  electrical: '电气',
  optical: '光学',
  debug: '调试',
}

const DEBOUNCE_MS = 400

export interface ProcessCardFormProps {
  operation: Operation
  mbomRootCode?: string
}

export function ProcessCardForm({ operation, mbomRootCode }: ProcessCardFormProps) {
  const queryClient = useQueryClient()
  const { data: systemNames = [] } = useDictionariesByCategory('system-name')
  const { data: assemblyLocations = [] } = useDictionariesByCategory('assembly-location')

  const [local, setLocal] = useState(operation)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mbomAutoFilledRef = useRef(false)

  useEffect(() => {
    setLocal(operation)
    mbomAutoFilledRef.current = false
  }, [operation.id, operation])

  const persist = useCallback(
    (partial: Partial<Operation>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        try {
          await updateOperation(operation.id, partial)
          await queryClient.invalidateQueries({ queryKey: ['operations'] })
          await queryClient.invalidateQueries({ queryKey: ['operation', operation.id] })
        } catch (e) {
          toast.error(e instanceof Error ? e.message : '保存失败')
        }
      }, DEBOUNCE_MS)
    },
    [operation.id, queryClient],
  )

  useEffect(() => {
    if (mbomAutoFilledRef.current || !mbomRootCode) return
    if (local.processCard.mbomRootCode) {
      mbomAutoFilledRef.current = true
      return
    }
    mbomAutoFilledRef.current = true
    const nextProcessCard = { ...local.processCard, mbomRootCode }
    setLocal((prev) => ({ ...prev, processCard: nextProcessCard }))
    persist({ processCard: nextProcessCard })
  }, [mbomRootCode, local.processCard.mbomRootCode, persist])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const updateProcessCard = (patch: Partial<Operation['processCard']>) => {
    const nextProcessCard = { ...local.processCard, ...patch }
    setLocal((prev) => ({ ...prev, processCard: nextProcessCard }))
    persist({ processCard: nextProcessCard })
  }

  const updateField = <K extends keyof Operation>(key: K, value: Operation[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }))
    persist({ [key]: value })
  }

  const updateStep = (index: number, patch: Partial<ProcessCardStep>) => {
    const steps = [...(local.processCard.steps ?? [])]
    steps[index] = { ...steps[index], ...patch }
    updateProcessCard({ steps })
  }

  const addStep = () => {
    const steps = [...(local.processCard.steps ?? []), { name: '', content: '', linked: false }]
    updateProcessCard({ steps })
  }

  const removeStep = (index: number) => {
    const steps = (local.processCard.steps ?? []).filter((_, i) => i !== index)
    updateProcessCard({ steps })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">工艺卡属性</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="pc-mbom-root">MBOM 根图号</Label>
            <Input
              id="pc-mbom-root"
              value={local.processCard.mbomRootCode ?? ''}
              onChange={(e) => updateProcessCard({ mbomRootCode: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pc-assembly-drawing">装配图号</Label>
            <Input
              id="pc-assembly-drawing"
              value={local.processCard.assemblyDrawingNo ?? ''}
              onChange={(e) => updateProcessCard({ assemblyDrawingNo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pc-machine-config">整机配置号</Label>
            <Input
              id="pc-machine-config"
              value={local.processCard.machineConfigNo ?? ''}
              onChange={(e) => updateProcessCard({ machineConfigNo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>系统名称</Label>
            <Select
              value={local.processCard.systemName ?? ''}
              onValueChange={(value) => updateProcessCard({ systemName: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择系统" />
              </SelectTrigger>
              <SelectContent>
                {systemNames.map((entry) => (
                  <SelectItem key={entry.id} value={entry.label}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>装配地点</Label>
            <Select
              value={local.processCard.assemblyLocation ?? ''}
              onValueChange={(value) => updateProcessCard({ assemblyLocation: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择地点" />
              </SelectTrigger>
              <SelectContent>
                {assemblyLocations.map((entry) => (
                  <SelectItem key={entry.id} value={entry.label}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="pc-environment">环境要求</Label>
            <Textarea
              id="pc-environment"
              rows={2}
              value={local.processCard.environmentNotes ?? ''}
              onChange={(e) => updateProcessCard({ environmentNotes: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">工序步骤</Label>
            <Button type="button" variant="outline" size="sm" onClick={addStep}>
              <Plus className="size-4" />
              添加工步
            </Button>
          </div>
          {(local.processCard.steps ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无工步，点击「添加工步」开始编制。</p>
          ) : (
            <div className="space-y-3">
              {(local.processCard.steps ?? []).map((step, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-start gap-3 rounded-md border p-3"
                >
                  <div className="min-w-[120px] flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">工步名称</Label>
                    <Input
                      value={step.name}
                      onChange={(e) => updateStep(index, { name: e.target.value })}
                    />
                  </div>
                  <div className="min-w-[200px] flex-[2] space-y-1">
                    <Label className="text-xs text-muted-foreground">工步内容</Label>
                    <Input
                      value={step.content}
                      onChange={(e) => updateStep(index, { content: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end gap-2 pb-1">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={step.linked}
                        onCheckedChange={(checked) =>
                          updateStep(index, { linked: checked === true })
                        }
                      />
                      已关联
                    </label>
                    <Badge variant={step.linked ? 'default' : 'destructive'}>
                      {step.linked ? '已关联' : '未关联'}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeStep(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="sw-key">关键工序</Label>
            <Switch
              id="sw-key"
              checked={local.isKeyProcess}
              onCheckedChange={(checked) => updateField('isKeyProcess', checked === true)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="sw-self">自检</Label>
            <Switch
              id="sw-self"
              checked={local.isSelfInspection}
              onCheckedChange={(checked) => updateField('isSelfInspection', checked === true)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="sw-special">专检</Label>
            <Switch
              id="sw-special"
              checked={local.isSpecialInspection}
              onCheckedChange={(checked) => updateField('isSpecialInspection', checked === true)}
            />
          </div>
          <div className="space-y-2">
            <Label>专业组</Label>
            <Select
              value={local.professionGroup}
              onValueChange={(value) =>
                updateField('professionGroup', value as ProfessionGroup)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PROFESSION_LABELS) as ProfessionGroup[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {PROFESSION_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pc-work-hours">工时 (h)</Label>
            <Input
              id="pc-work-hours"
              type="number"
              min={0}
              step={0.1}
              value={local.workHours}
              onChange={(e) => updateField('workHours', Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pc-headcount">人数</Label>
            <Input
              id="pc-headcount"
              type="number"
              min={1}
              step={1}
              value={local.headcount}
              onChange={(e) => updateField('headcount', Number(e.target.value) || 1)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
