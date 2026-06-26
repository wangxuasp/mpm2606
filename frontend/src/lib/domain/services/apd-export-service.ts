import ExcelJS from 'exceljs'
import { getMbomSubtree } from '@/lib/db/repositories/bom-repository'
import { getBopSubtree } from '@/lib/db/repositories/bop-repository'
import { collaborationRepository } from '@/lib/db/repositories/collaboration-repository'
import { getAllForBopRoot } from '@/lib/db/repositories/operation-repository'

export async function exportApdExcel(collaborationId: string): Promise<Blob> {
  const collaboration = await collaborationRepository.getById(collaborationId)
  if (!collaboration) {
    throw new Error(`Collaboration ${collaborationId} not found`)
  }

  const workbook = new ExcelJS.Workbook()

  const bopSheet = workbook.addWorksheet('工艺路线')
  bopSheet.columns = [
    { header: '层级', key: 'level', width: 12 },
    { header: '编号', key: 'code', width: 16 },
    { header: '名称', key: 'name', width: 30 },
    { header: '版本', key: 'revision', width: 10 },
    { header: '负责人', key: 'owner', width: 14 },
  ]

  if (collaboration.bopRootId) {
    const bopNodes = await getBopSubtree(collaboration.bopRootId)
    for (const node of bopNodes) {
      bopSheet.addRow({
        level: node.level,
        code: node.code,
        name: node.name,
        revision: node.revision,
        owner: node.owner,
      })
    }
  }

  const opSheet = workbook.addWorksheet('工序清单')
  opSheet.columns = [
    { header: '工序编号', key: 'code', width: 16 },
    { header: '工序名称', key: 'name', width: 30 },
    { header: '版本', key: 'revision', width: 10 },
    { header: '专业组', key: 'professionGroup', width: 12 },
    { header: '工时', key: 'workHours', width: 10 },
    { header: '人数', key: 'headcount', width: 8 },
    { header: '关键工序', key: 'isKeyProcess', width: 10 },
  ]

  const operations = collaboration.bopRootId
    ? await getAllForBopRoot(collaboration.bopRootId)
    : []
  for (const op of operations) {
    opSheet.addRow({
      code: op.code,
      name: op.name,
      revision: op.revision,
      professionGroup: op.professionGroup,
      workHours: op.workHours,
      headcount: op.headcount,
      isKeyProcess: op.isKeyProcess ? '是' : '否',
    })
  }

  const mbomSheet = workbook.addWorksheet('MBOM摘要')
  mbomSheet.columns = [
    { header: '图号', key: 'code', width: 16 },
    { header: '名称', key: 'name', width: 30 },
    { header: '版本', key: 'revision', width: 10 },
    { header: '类型', key: 'kind', width: 14 },
    { header: '数量', key: 'quantity', width: 10 },
    { header: '关重件', key: 'criticality', width: 10 },
  ]

  if (collaboration.mbomRootId) {
    const mbomNodes = await getMbomSubtree(collaboration.mbomRootId)
    for (const node of mbomNodes) {
      mbomSheet.addRow({
        code: node.code,
        name: node.name,
        revision: node.revision,
        kind: node.kind,
        quantity: node.quantity ?? 1,
        criticality: node.criticality || '—',
      })
    }
  }

  const cardSheet = workbook.addWorksheet('工艺卡头信息')
  cardSheet.columns = [
    { header: '工序编号', key: 'code', width: 16 },
    { header: '工序名称', key: 'name', width: 24 },
    { header: 'MBOM根图号', key: 'mbomRootCode', width: 16 },
    { header: '装配图号', key: 'assemblyDrawingNo', width: 16 },
    { header: '整机配置号', key: 'machineConfigNo', width: 16 },
    { header: '系统名称', key: 'systemName', width: 16 },
    { header: '装配地点', key: 'assemblyLocation', width: 16 },
    { header: '环境要求', key: 'environmentNotes', width: 24 },
  ]

  for (const op of operations) {
    const card = op.processCard
    cardSheet.addRow({
      code: op.code,
      name: op.name,
      mbomRootCode: card.mbomRootCode ?? '',
      assemblyDrawingNo: card.assemblyDrawingNo ?? '',
      machineConfigNo: card.machineConfigNo ?? '',
      systemName: card.systemName ?? '',
      assemblyLocation: card.assemblyLocation ?? '',
      environmentNotes: card.environmentNotes ?? '',
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
