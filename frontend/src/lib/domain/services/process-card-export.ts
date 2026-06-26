import ExcelJS from 'exceljs'
import type { Operation } from '@/lib/domain/types'

const HEADER_FIELDS: { key: keyof Operation['processCard'] | 'code' | 'name'; label: string }[] = [
  { key: 'code', label: '工序编号' },
  { key: 'name', label: '工序名称' },
  { key: 'mbomRootCode', label: 'MBOM 根图号' },
  { key: 'assemblyDrawingNo', label: '装配图号' },
  { key: 'machineConfigNo', label: '整机配置号' },
  { key: 'systemName', label: '系统名称' },
  { key: 'assemblyLocation', label: '装配地点' },
  { key: 'environmentNotes', label: '环境要求' },
]

export async function exportOperationToExcel(operation: Operation): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('工艺卡')

  sheet.columns = [
    { header: '字段', key: 'field', width: 20 },
    { header: '值', key: 'value', width: 40 },
  ]

  for (const { key, label } of HEADER_FIELDS) {
    const value =
      key === 'code' || key === 'name'
        ? operation[key]
        : operation.processCard[key]
    sheet.addRow({ field: label, value: value ?? '' })
  }

  sheet.addRow({ field: '', value: '' })
  sheet.addRow({ field: '工序步骤', value: '' })

  const steps = operation.processCard.steps ?? []
  if (steps.length === 0) {
    sheet.addRow({ field: '（无步骤）', value: '' })
  } else {
    for (const [index, step] of steps.entries()) {
      sheet.addRow({
        field: `${index + 1}. ${step.name}`,
        value: `${step.content}${step.linked ? ' [已关联]' : ' [未关联]'}`,
      })
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
