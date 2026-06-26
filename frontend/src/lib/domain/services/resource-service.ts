import ExcelJS from 'exceljs'
import { v4 as uuidv4 } from 'uuid'
import { resourceRepository } from '@/lib/db/repositories/resource-repository'
import type { Resource, ResourceKind } from '@/lib/domain/types'

export interface CreateResourceInput {
  kind: ResourceKind
  code: string
  name: string
  model?: string
  vendor?: string
  category?: string
  parentCategoryId?: string | null
  inLibrary?: boolean
}

function defaultResource(input: CreateResourceInput): Resource {
  return {
    id: uuidv4(),
    kind: input.kind,
    code: input.code,
    name: input.name,
    model: input.model ?? '',
    status: 'active',
    vendor: input.vendor ?? '',
    category: input.category ?? '',
    usageState: 'available',
    revision: 'A',
    lifecycleState: 'draft',
    inLibrary: input.inLibrary ?? true,
    parentCategoryId: input.parentCategoryId ?? null,
  }
}

export async function createResource(input: CreateResourceInput): Promise<Resource> {
  return resourceRepository.create(defaultResource(input))
}

export async function updateResource(id: string, partial: Partial<Resource>): Promise<Resource> {
  return resourceRepository.update(id, partial)
}

export async function deleteResource(id: string): Promise<void> {
  await resourceRepository.delete(id)
}

export async function setInLibrary(id: string, inLibrary: boolean): Promise<Resource> {
  return resourceRepository.update(id, { inLibrary })
}

export async function searchResources(query: string, kind?: ResourceKind): Promise<Resource[]> {
  const all = await resourceRepository.getAll()
  const q = query.trim().toLowerCase()
  return all.filter((resource) => {
    if (kind && resource.kind !== kind) return false
    if (!q) return true
    return (
      resource.code.toLowerCase().includes(q) ||
      resource.name.toLowerCase().includes(q) ||
      resource.model.toLowerCase().includes(q) ||
      resource.vendor.toLowerCase().includes(q) ||
      resource.category.toLowerCase().includes(q)
    )
  })
}

const IMPORT_COLUMNS = ['kind', 'code', 'name', 'model', 'vendor', 'category'] as const

export async function importResourcesFromExcel(file: File): Promise<number> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new Error('Excel 文件无工作表')

  const headerRow = sheet.getRow(1)
  const colIndex = new Map<string, number>()
  headerRow.eachCell((cell, colNumber) => {
    const key = String(cell.value ?? '').trim().toLowerCase()
    if (key) colIndex.set(key, colNumber)
  })

  for (const col of IMPORT_COLUMNS) {
    if (!colIndex.has(col)) {
      throw new Error(`缺少列: ${col}`)
    }
  }

  let imported = 0
  for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
    const row = sheet.getRow(rowNum)
    const kind = String(row.getCell(colIndex.get('kind')!).value ?? '').trim() as ResourceKind
    const code = String(row.getCell(colIndex.get('code')!).value ?? '').trim()
    const name = String(row.getCell(colIndex.get('name')!).value ?? '').trim()
    if (!code && !name) continue
    if (!kind || !code || !name) {
      throw new Error(`第 ${rowNum} 行缺少 kind/code/name`)
    }

    const model = String(row.getCell(colIndex.get('model')!).value ?? '').trim()
    const vendor = String(row.getCell(colIndex.get('vendor')!).value ?? '').trim()
    const category = String(row.getCell(colIndex.get('category')!).value ?? '').trim()

    await createResource({ kind, code, name, model, vendor, category, inLibrary: true })
    imported++
  }

  return imported
}
