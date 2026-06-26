'use client'

import dynamic from 'next/dynamic'
import type { Pitem } from '@/lib/api/pitem-client'

export interface PitemGridProps {
  rowData: Pitem[]
}

const PitemGridImpl = dynamic(
  () => import('./pitem-grid-impl').then((m) => m.PitemGridImpl),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        加载表格...
      </div>
    ),
  },
)

export function PitemGrid(props: PitemGridProps) {
  return <PitemGridImpl {...props} />
}
