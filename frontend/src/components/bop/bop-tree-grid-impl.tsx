'use client'

import { useCallback, useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import {
  type ColDef,
  type GridReadyEvent,
  type RowDragEndEvent,
} from 'ag-grid-community'
import type { BopNode } from '@/lib/domain/types'
import '@/lib/ag-grid/setup'
import {
  buildBopTreeRows,
  LEVEL_LABELS,
  LIFECYCLE_LABELS,
  type BopTreeRow,
} from './bop-tree-utils'
import type { BopTreeGridProps } from './bop-tree-grid'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

function GroupCellRenderer({ data }: { data?: BopTreeRow }) {
  if (!data) return null
  return (
    <span className="truncate">
      {data.code} — {data.name}
    </span>
  )
}

export function BopTreeGridImpl({
  nodes,
  rootId,
  readOnly = false,
  onNodeSelect,
  onRowDragEnd,
}: BopTreeGridProps) {
  const gridRef = useRef<AgGridReact<BopTreeRow>>(null)

  const rowData = useMemo(() => buildBopTreeRows(nodes, rootId), [nodes, rootId])

  const columnDefs = useMemo<ColDef<BopTreeRow>[]>(
    () => [
      {
        field: 'code',
        headerName: '编号',
        width: 120,
        hide: true,
      },
      {
        field: 'name',
        headerName: '名称',
        flex: 1,
        minWidth: 120,
        hide: true,
      },
      {
        field: 'revision',
        headerName: '版本',
        width: 80,
      },
      {
        field: 'level',
        headerName: '层级',
        width: 110,
        valueFormatter: (p) => (p.value ? LEVEL_LABELS[p.value as BopNode['level']] : ''),
      },
      {
        field: 'lifecycleState',
        headerName: '生命周期',
        width: 100,
        valueFormatter: (p) =>
          p.value ? LIFECYCLE_LABELS[p.value as BopNode['lifecycleState']] : '',
      },
      {
        field: 'owner',
        headerName: '负责人',
        width: 100,
      },
    ],
    [],
  )

  const autoGroupColumnDef = useMemo<ColDef<BopTreeRow>>(
    () => ({
      headerName: '工艺路线',
      minWidth: 240,
      flex: 2,
      rowDrag: !readOnly,
      cellRendererParams: {
        suppressCount: true,
        innerRenderer: GroupCellRenderer,
      },
    }),
    [readOnly],
  )

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: false,
      filter: false,
      resizable: true,
    }),
    [],
  )

  const onGridReady = useCallback((event: GridReadyEvent<BopTreeRow>) => {
    event.api.sizeColumnsToFit()
  }, [])

  const handleRowClicked = useCallback(
    (event: { data?: BopTreeRow }) => {
      onNodeSelect?.(event.data ?? null)
    },
    [onNodeSelect],
  )

  const handleRowDragEnd = useCallback(
    (event: RowDragEndEvent<BopTreeRow>) => {
      if (readOnly || !event.node.data) return
      const node = event.node.data
      if (node.lifecycleState === 'released') return
      const newParentId = event.overNode?.data?.id ?? rootId
      if (newParentId && node.id !== newParentId) {
        const newParent = event.overNode?.data
        if (newParent?.lifecycleState === 'released') return
        onRowDragEnd?.(node.id, newParentId)
      }
    },
    [readOnly, rootId, onRowDragEnd],
  )

  if (!rootId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        暂无 BOP 数据
      </div>
    )
  }

  return (
    <div className="ag-theme-quartz h-full w-full">
      <AgGridReact<BopTreeRow>
        ref={gridRef}
        theme="legacy"
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        treeData
        getDataPath={(data) => data.path}
        autoGroupColumnDef={autoGroupColumnDef}
        groupDefaultExpanded={-1}
        getRowId={(params) => params.data.id}
        animateRows
        suppressMoveWhenRowDragging
        onGridReady={onGridReady}
        onRowClicked={handleRowClicked}
        onRowDragEnd={handleRowDragEnd}
      />
    </div>
  )
}
