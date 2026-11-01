import type { TcPropertyValue } from '@/lib/api/metadata-client'

/**
 * 空属性的原因文案。后端只会在确实能判定原因时给出这些值，
 * 前端不要兜底成同一个"空"，否则客户数据比对时分不清差别。
 */
export function emptyReasonLabel(reason?: string | null): string {
  switch (reason) {
    case 'TABLE_NOT_MIGRATED':
      return '扩展表未迁入'
    case 'ROW_NOT_MIGRATED':
      return '扩展行未迁入'
    case 'NOT_DEFINED':
      return '未定义'
    case 'NO_PERMISSION':
      return '无权限'
    case 'NOT_PERSISTED':
      return '未持久化'
    case 'EMPTY_VLA':
      return '多值但无记录'
    case 'NULL_VALUE':
      return '已定义但为空'
    default:
      return '空值'
  }
}

/** 常规页签要展示的系统属性，顺序与 Teamcenter 属性对话框一致。 */
export const GENERAL_PROPERTY_NAMES = [
  'object_string',
  'pobject_name',
  'pobject_desc',
  'pobject_type',
  'owning_user',
  'owning_group',
  'last_mod_user',
  'creation_date',
  'last_mod_date',
]

export function formatPropertyValue(value?: string | null): string {
  if (value === null || value === undefined || value === '') return ''
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return parsed.toLocaleString('zh-CN')
  }
  return value
}

/** 该属性是不是"业务属性"（排除常规页签里的系统属性）。 */
export function isExtensionProperty(property: TcPropertyValue): boolean {
  return !GENERAL_PROPERTY_NAMES.includes(property.propertyName)
}
