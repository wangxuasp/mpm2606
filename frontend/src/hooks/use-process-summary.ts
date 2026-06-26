'use client'

import { useCallback, useState } from 'react'
import { buildProcessSummary, type ProcessSummary } from '@/lib/domain/services/process-summary-service'
import {
  downloadProcessSummaryExcel,
  exportProcessSummaryExcel,
} from '@/lib/domain/services/summary-export-service'
import { useWorkspaceStore } from '@/stores/workspace-store'

export function useProcessSummary() {
  const collaborationId = useWorkspaceStore((s) => s.collaborationId)
  const [summary, setSummary] = useState<ProcessSummary | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const build = useCallback(async () => {
    if (!collaborationId) {
      throw new Error('未选择协同上下文')
    }
    setIsBuilding(true)
    try {
      const next = await buildProcessSummary(collaborationId)
      setSummary(next)
      return next
    } finally {
      setIsBuilding(false)
    }
  }, [collaborationId])

  const exportExcel = useCallback(
    async (data?: ProcessSummary) => {
      const target = data ?? summary
      if (!target) {
        throw new Error('请先生成汇总')
      }
      setIsExporting(true)
      try {
        const blob = await exportProcessSummaryExcel(target)
        downloadProcessSummaryExcel(blob)
      } finally {
        setIsExporting(false)
      }
    },
    [summary],
  )

  return {
    collaborationId,
    summary,
    isBuilding,
    isExporting,
    build,
    exportExcel,
  }
}
