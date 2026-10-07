'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ICellRendererParams } from 'ag-grid-community'
import {
  type CellValueChangedEvent,
  type ColDef,
  type GridReadyEvent,
  type RowDragEndEvent,
  type SelectionChangedEvent,
} from 'ag-grid-community'
import type { BomNode } from '@/lib/domain/types'
import '@/lib/ag-grid/setup'
import {
  buildTreeRows,
  findRowIdFromDragEvent,
  KIND_ICONS,
  KIND_LABELS,
  MAKE_TYPE_LABELS,
  type BomTreeRow,
} from './bom-tree-utils'
import type { BomTreeGridProps } from './bom-tree-grid'
import {
  readBomNodeIdFromDataTransfer,
  setPendingBomDrag,
  writeBomNodeIdToDataTransfer,
} from './bom-drag-store'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

function KindIcon({ kind }: { kind: BomTreeRow['kind'] }) {
  const Icon = KIND_ICONS[kind]
  const label = KIND_LABELS[kind]
  return (
    <Icon
      className="size-3.5 shrink-0 text-muted-foreground"
      aria-label={label}
      title={label}
    />
  )
}

function KindCellRenderer(params: ICellRendererParams<BomTreeRow>) {
  const data = params.data
  if (!data?.kind) return null
  return (
    <span className="inline-flex items-center gap-1.5">
      <KindIcon kind={data.kind} />
      <span className="truncate">{KIND_LABELS[data.kind]}</span>
    </span>
  )
}

function makeGroupCellRenderer(enableNativeDrag: boolean) {
  return function GroupCellRenderer(params: ICellRendererParams<BomTreeRow>) {
    const data = params.data
    if (!data) return null
    const label = (
      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
        <KindIcon kind={data.kind} />
        <span className="truncate">
          {data.code} — {data.name}
        </span>
      </span>
    )
    if (!enableNativeDrag) return label
    return (
      <span
        draggable
        className="inline-flex max-w-full cursor-grab items-center active:cursor-grabbing"
        onDragStart={(e) => {
          e.stopPropagation()
          if (e.dataTransfer) {
            writeBomNodeIdToDataTransfer(e.dataTransfer, data.id)
          } else {
            setPendingBomDrag(data.id)
          }
        }}
        onDragEnd={() => setPendingBomDrag(null)}
      >
        {label}
      </span>
    )
  }
}

export function BomTreeGridImpl({
  nodes,
  rootId,
  readOnly = false,
  onNodeSelect,
  onRowDragEnd,
  dragSource = false,
  dropTarget = false,
  onExternalDrop,
  multiSelect = false,
  onSelectionChanged,
  onCellValueChanged,
}: BomTreeGridProps) {
  const gridRef = useRef<AgGridReact<BomTreeRow>>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  const rowData = useMemo(() => buildTreeRows(nodes, rootId), [nodes, rootId])

  const columnDefs = useMemo<ColDef<BomTreeRow>[]>(
    () => [
      {
        field: 'code',
        headerName: '图号',
        width: 140,
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
        field: 'kind',
        headerName: '类型',
        width: 120,
        cellRenderer: KindCellRenderer,
      },
      {
        field: 'makeType',
        headerName: '制造类型',
        width: 120,
        editable: !readOnly,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['self', 'outsource', 'outsource-with-material'],
        },
        valueFormatter: (p) =>
          p.value ? MAKE_TYPE_LABELS[p.value as NonNullable<BomNode['makeType']>] : '—',
      },
      {
        field: 'criticality',
        headerName: '关重件',
        width: 80,
        valueFormatter: (p) => p.value || '—',
      },
      {
        field: 'quantity',
        headerName: '数量',
        width: 80,
        editable: !readOnly,
        valueFormatter: (p) => (p.value != null ? String(p.value) : '—'),
      },
    ],
    [readOnly],
  )

  const autoGroupColumnDef = useMemo<ColDef<BomTreeRow>>(
    () => ({
      headerName: '结构',
      minWidth: 260,
      flex: 2,
      // dragSource 使用原生 HTML5 拖拽；否则用 AG Grid 行拖拽做树内 reparent
      rowDrag: !dragSource && !readOnly,
      cellRendererParams: {
        suppressCount: true,
        innerRenderer: makeGroupCellRenderer(dragSource),
      },
    }),
    [dragSource, readOnly],
  )

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: false,
      filter: false,
      resizable: true,
    }),
    [],
  )

  const onGridReady = useCallback((event: GridReadyEvent<BomTreeRow>) => {
    event.api.sizeColumnsToFit()
  }, [])

  const handleRowClicked = useCallback(
    (event: { data?: BomTreeRow }) => {
      onNodeSelect?.(event.data ?? null)
    },
    [onNodeSelect],
  )

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<BomTreeRow>) => {
      if (!multiSelect || !onSelectionChanged) return
      onSelectionChanged(event.api.getSelectedRows())
    },
    [multiSelect, onSelectionChanged],
  )

  const handleCellValueChanged = useCallback(
    (event: CellValueChangedEvent<BomTreeRow>) => {
      if (!event.data || event.newValue === event.oldValue) return
      onCellValueChanged?.(event.data.id, event.colDef.field ?? '', event.newValue)
    },
    [onCellValueChanged],
  )

  const handleRowDragEnd = useCallback(
    (event: RowDragEndEvent<BomTreeRow>) => {
      if (dragSource || readOnly || !event.node.data) return
      const nodeId = event.node.data.id
      const newParentId = event.overNode?.data?.id ?? rootId
      if (newParentId && nodeId !== newParentId) {
        onRowDragEnd?.(nodeId, newParentId)
      }
    },
    [dragSource, readOnly, rootId, onRowDragEnd],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!dropTarget) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setDropTargetId(findRowIdFromDragEvent(e))
    },
    [dropTarget],
  )

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!dropTarget) return
      e.preventDefault()
      const bomNodeId = readBomNodeIdFromDataTransfer(e.dataTransfer)
      if (!bomNodeId) return
      const targetParentMbomId = findRowIdFromDragEvent(e) ?? dropTargetId ?? rootId
      onExternalDrop?.(bomNodeId, targetParentMbomId)
      setPendingBomDrag(null)
      setDropTargetId(null)
    },
    [dropTarget, dropTargetId, rootId, onExternalDrop],
  )

  if (!rootId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        暂无结构数据
      </div>
    )
  }

  return (
    <div
      className={`ag-theme-quartz h-full w-full ${dropTarget && dropTargetId ? 'ring-2 ring-primary/40' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <AgGridReact<BomTreeRow>
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
        rowSelection={
          multiSelect
            ? { mode: 'multiRow', checkboxes: true, headerCheckbox: true }
            : undefined
        }
        animateRows
        suppressMoveWhenRowDragging
        onGridReady={onGridReady}
        onRowClicked={handleRowClicked}
        onSelectionChanged={handleSelectionChanged}
        onCellValueChanged={handleCellValueChanged}
        onRowDragEnd={handleRowDragEnd}
      />
    </div>
  )
}
