import ExcelJS from 'exceljs'
import type { ChangeOrder } from '@/lib/domain/types'

const COLUMNS: { key: keyof ChangeOrder | 'reasonCategory'; header: string; width: number }[] = [
  { key: 'id', header: '更改单编号', width: 36 },
  { key: 'productCode', header: '产品代号', width: 16 },
  { key: 'machineDrawingNo', header: '整机图号', width: 20 },
  { key: 'reasonCategory', header: '更改原因分类', width: 16 },
  { key: 'reason', header: '更改原因', width: 30 },
  { key: 'contentDiff', header: '更改内容', width: 40 },
  { key: 'impactAnalysis', header: '影响分析', width: 40 },
  { key: 'lifecycleState', header: '状态', width: 12 },
  { key: 'createdAt', header: '创建时间', width: 22 },
]

const LIFECYCLE_LABELS: Record<ChangeOrder['lifecycleState'], string> = {
  draft: '草稿',
  'in-review': '审批中',
  released: '已发布',
}

export async function exportChangeOrdersToExcel(orders: ChangeOrder[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('工艺更改汇总')

  sheet.columns = COLUMNS.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }))

  sheet.getRow(1).font = { bold: true }

  for (const order of orders) {
    sheet.addRow({
      id: order.id,
      productCode: order.productCode,
      machineDrawingNo: order.machineDrawingNo,
      reasonCategory: order.reasonCategory ?? '',
      reason: order.reason,
      contentDiff: order.contentDiff,
      impactAnalysis: order.impactAnalysis,
      lifecycleState: LIFECYCLE_LABELS[order.lifecycleState],
      createdAt: order.createdAt
        ? new Date(order.createdAt).toLocaleString()
        : '',
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function downloadChangeOrdersExcel(blob: Blob, filename = '工艺更改汇总.xlsx') {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
