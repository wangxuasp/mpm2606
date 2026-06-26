import { useQuery } from '@tanstack/react-query'
import type { DictionaryCategory } from '@/lib/domain/types'
import {
  dictionaryRepository,
  getByCategory,
} from '@/lib/db/repositories/dictionary-repository'

export function useDictionaries() {
  return useQuery({
    queryKey: ['dictionaries'],
    queryFn: () => dictionaryRepository.getAll(),
  })
}

export function useDictionariesByCategory(category: DictionaryCategory) {
  return useQuery({
    queryKey: ['dictionaries', category],
    queryFn: () => getByCategory(category),
  })
}
