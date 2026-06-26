import ExcelJS from 'exceljs'
import { v4 as uuidv4 } from 'uuid'
import { invoke } from '@/lib/ai/llm-client'

export interface ApdImportRow {
  id: string
  selected: boolean
  entityType: 'bop' | 'operation' | 'resource'
  code: string
  name: string
  parentCode?: string
  sourceSheet: string
  confidence?: number
}

const OP_PATTERN = /(?:工序|OP)[\s:：-]*([A-Z0-9-]+)/i
const DRAWING_PATTERN = /(?:图号|drawing)[\s:：-]*([A-Z0-9][\w-]*)/i
const STAGE_PATTERN = /(?:阶段|集成|stage)[\s:：-]*(.+)/i
const GENERIC_CODE = /^[A-Z]{1,4}[-_]?\d{2,}[\w-]*$/i

function cellValue(cell: ExcelJS.Cell): string {
  const value = cell.value
  if (value == null) return ''
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') {
    return value.text.trim()
  }
  if (typeof value === 'object' && 'result' in value) {
    return String(value.result ?? '').trim()
  }
  return String(value).trim()
}

function rowTexts(row: ExcelJS.Row): string[] {
  const texts: string[] = []
  row.eachCell({ includeEmpty: false }, (cell) => {
    const text = cellValue(cell)
    if (text) texts.push(text)
  })
  return texts
}

function inferEntityFromRow(
  texts: string[],
  sheetName: string,
): Omit<ApdImportRow, 'id' | 'selected'> | null {
  const joined = texts.join(' ')

  const opMatch = joined.match(OP_PATTERN) ?? texts.find((t) => /^OP[-_]?\d+/i.test(t))
  if (opMatch || /工序/.test(joined)) {
    const code =
      (typeof opMatch === 'string' ? opMatch : opMatch?.[1]) ??
      texts.find((t) => /^OP[-_]?\d+/i.test(t)) ??
      `OP-${texts[0]?.slice(0, 12) ?? 'UNKNOWN'}`
    const name =
      texts.find((t) => t.includes('工序') && t.length > 4)?.replace(/^.*工序[\s:：-]*/, '') ??
      texts.find((t) => !/^OP/i.test(t) && t.length > 1) ??
      '未命名工序'
    return {
      entityType: 'operation',
      code: code.replace(/\s/g, ''),
      name,
      parentCode: texts.find((t) => STAGE_PATTERN.test(t))?.match(STAGE_PATTERN)?.[1],
      sourceSheet: sheetName,
    }
  }

  const drawingMatch = joined.match(DRAWING_PATTERN)
  if (drawingMatch || texts.some((t) => GENERIC_CODE.test(t))) {
    const code =
      drawingMatch?.[1] ?? texts.find((t) => GENERIC_CODE.test(t)) ?? texts[0]
    if (!code) return null
    const name = texts.find((t) => t !== code && !GENERIC_CODE.test(t)) ?? code
    const isResource = /工具|工装|资源|设备|tool|resource/i.test(joined)
    return {
      entityType: isResource ? 'resource' : 'bop',
      code,
      name,
      sourceSheet: sheetName,
    }
  }

  const stageMatch = joined.match(STAGE_PATTERN)
  if (stageMatch) {
    return {
      entityType: 'bop',
      code: texts.find((t) => GENERIC_CODE.test(t)) ?? `STG-${stageMatch[1].slice(0, 8)}`,
      name: stageMatch[1].trim(),
      sourceSheet: sheetName,
    }
  }

  if (/工序|OP|图号|阶段|工艺/i.test(joined)) {
    return {
      entityType: 'operation',
      code: texts[0] || `ROW-${Date.now()}`,
      name: texts[1] ?? texts[0] ?? '解析行',
      sourceSheet: sheetName,
    }
  }

  return null
}

export async function parseApdExcel(file: File): Promise<ApdImportRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const rows: ApdImportRow[] = []
  const seen = new Set<string>()

  for (const sheet of workbook.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1 && /编号|名称|图号|工序/i.test(rowTexts(row).join(' '))) {
        return
      }

      const texts = rowTexts(row)
      if (texts.length === 0) return

      const inferred = inferEntityFromRow(texts, sheet.name)
      if (!inferred) return

      const key = `${inferred.entityType}:${inferred.code}:${inferred.sourceSheet}`
      if (seen.has(key)) return
      seen.add(key)

      rows.push({
        id: uuidv4(),
        selected: true,
        ...inferred,
      })
    })
  }

  return rows
}

export async function mockEnrichWithLlm(rows: ApdImportRow[]): Promise<ApdImportRow[]> {
  await invoke(
    [{ role: 'user', content: `Enrich ${rows.length} APD import rows with confidence scores.` }],
    { scenario: 'historical-import', context: { rowCount: rows.length } },
  )

  return rows.map((row, index) => ({
    ...row,
    confidence: Math.min(0.99, 0.65 + ((index * 7) % 30) / 100),
  }))
}
