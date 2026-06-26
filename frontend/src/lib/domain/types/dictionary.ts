export type DictionaryCategory = 'assembly-location' | 'system-name'
export interface DictionaryEntry {
  id: string
  category: DictionaryCategory
  code: string
  label: string
  sortOrder: number
}
