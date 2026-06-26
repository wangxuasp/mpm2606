import ExcelJS from 'exceljs'
import type { ProcessSummary } from '@/lib/domain/services/process-summary-service'

const RESOURCE_KIND_LABELS: Record<string, string> = {
  equipment: '设备',
  tool: '工具',
  tooling: '工装',
  consumable: '耗材',
}

export async function exportProcessSummaryExcel(summary: ProcessSummary): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()

  const installedSheet = workbook.addWorksheet('装入件')
  installedSheet.columns = [
    { header: '图号', key: 'code', width: 24 },
    { header: '名称', key: 'name', width: 28 },
    { header: '数量', key: 'quantity', width: 10 },
    { header: '工序号', key: 'operationCode', width: 16 },
    { header: '工序名称', key: 'operationName', width: 24 },
  ]
  installedSheet.getRow(1).font = { bold: true }
  for (const row of summary.installedParts) {
    installedSheet.addRow(row)
  }

  const equipmentSheet = workbook.addWorksheet('设备工具')
  equipmentSheet.columns = [
    { header: '编码', key: 'code', width: 20 },
    { header: '名称', key: 'name', width: 28 },
    { header: '类型', key: 'kind', width: 12 },
    { header: '工序号', key: 'operationCode', width: 16 },
  ]
  equipmentSheet.getRow(1).font = { bold: true }
  for (const row of summary.equipmentTools) {
    equipmentSheet.addRow({
      ...row,
      kind: RESOURCE_KIND_LABELS[row.kind] ?? row.kind,
    })
  }

  const toolingSheet = workbook.addWorksheet('专用工装')
  toolingSheet.columns = [
    { header: '图号', key: 'code', width: 24 },
    { header: '名称', key: 'name', width: 28 },
    { header: '数量', key: 'quantity', width: 10 },
    { header: '工序号', key: 'operationCode', width: 16 },
  ]
  toolingSheet.getRow(1).font = { bold: true }
  for (const row of summary.toolings) {
    toolingSheet.addRow(row)
  }

  const materialSheet = workbook.addWorksheet('材料定额')
  materialSheet.columns = [
    { header: '图号', key: 'code', width: 24 },
    { header: '名称', key: 'name', width: 28 },
    { header: '消耗定额', key: 'consumptionQuota', width: 12 },
    { header: '废品率', key: 'scrapRate', width: 10 },
    { header: '工位编码', key: 'stationCode', width: 14 },
    { header: '子项类型', key: 'subItemType', width: 14 },
  ]
  materialSheet.getRow(1).font = { bold: true }
  for (const row of summary.materialQuotas) {
    materialSheet.addRow({
      code: row.code,
      name: row.name,
      consumptionQuota: row.consumptionQuota,
      scrapRate: row.scrapRate,
      stationCode: row.stationCode,
      subItemType: row.subItemType,
    })
  }

  const workHoursSheet = workbook.addWorksheet('工时定额')
  workHoursSheet.columns = [
    { header: '工序号', key: 'operationCode', width: 16 },
    { header: '工序名称', key: 'operationName', width: 28 },
    { header: '工时(h)', key: 'workHours', width: 12 },
  ]
  workHoursSheet.getRow(1).font = { bold: true }
  for (const row of summary.workHours) {
    workHoursSheet.addRow(row)
  }

  const headcountSheet = workbook.addWorksheet('人员定额')
  headcountSheet.columns = [
    { header: '工序号', key: 'operationCode', width: 16 },
    { header: '工序名称', key: 'operationName', width: 28 },
    { header: '人数', key: 'headcount', width: 10 },
  ]
  headcountSheet.getRow(1).font = { bold: true }
  for (const row of summary.headcount) {
    headcountSheet.addRow(row)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function downloadProcessSummaryExcel(blob: Blob, filename = '工艺汇总.xlsx') {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
