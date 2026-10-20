'use client'

import { useCallback, useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ICellRendererParams } from 'ag-grid-community'
import { GripVertical } from 'lucide-react'
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
  findRowElementFromDragEvent,
  findRowIdFromDragEvent,
  KIND_ICONS,
  KIND_LABELS,
  MAKE_TYPE_LABELS,
  type BomTreeRow,
} from './bom-tree-utils'
import type { BomTreeGridProps } from './bom-tree-grid'
import {
  readBomNodeIdFromDataTransfer,
  setTreeNodeDragPreview,
  setPendingBomDrag,
  writeBomNodeIdToDataTransfer,
} from './bom-drag-store'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

function KindIcon({ kind }: { kind: BomTreeRow['kind'] }) {
  const Icon = KIND_ICONS[kind]
  const label = KIND_LABELS[kind]
  return (
    <span title={label} aria-label={label}>
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
    </span>
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
        title="拖动以复制到目标结构"
        className="inline-flex w-full max-w-full cursor-grab items-center gap-1.5 active:cursor-grabbing"
        onDragStart={(e) => {
          e.stopPropagation()
          setTreeNodeDragPreview(e, `${data.code} — ${data.name}`, '复制到目标结构')
          if (e.dataTransfer) {
            writeBomNodeIdToDataTransfer(e.dataTransfer, data.id)
          } else {
            setPendingBomDrag(data.id)
          }
        }}
        onDragEnd={() => setPendingBomDrag(null)}
      >
        <GripVertical className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
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
  onCopyNode,
  onPasteNode,
  onCloneNode,
  onViewProperties,
  canPaste = false,
}: BomTreeGridProps) {
  const gridRef = useRef<AgGridReact<BomTreeRow>>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropTargetRef = useRef<string | null>(null)

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
      const nextTargetId = findRowIdFromDragEvent(e)
      if (dropTargetRef.current === nextTargetId) return
      containerRef.current
        ?.querySelectorAll('.mpms-tree-drop-target')
        .forEach((row) => row.classList.remove('mpms-tree-drop-target'))
      findRowElementFromDragEvent(e)?.classList.add('mpms-tree-drop-target')
      dropTargetRef.current = nextTargetId
    },
    [dropTarget],
  )

  const clearDropTarget = useCallback(() => {
    dropTargetRef.current = null
    containerRef.current
      ?.querySelectorAll('.mpms-tree-drop-target')
      .forEach((row) => row.classList.remove('mpms-tree-drop-target'))
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget
    if (relatedTarget instanceof Node && e.currentTarget.contains(relatedTarget)) return
    clearDropTarget()
  }, [clearDropTarget])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!dropTarget) return
      e.preventDefault()
      const bomNodeId = readBomNodeIdFromDataTransfer(e.dataTransfer)
      if (!bomNodeId) return
      const targetParentMbomId = findRowIdFromDragEvent(e) ?? dropTargetRef.current ?? rootId
      onExternalDrop?.(bomNodeId, targetParentMbomId)
      setPendingBomDrag(null)
      clearDropTarget()
    },
    [dropTarget, rootId, onExternalDrop, clearDropTarget],
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
      ref={containerRef}
      className="ag-theme-quartz h-full w-full"
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
        getContextMenuItems={(params) => {
          const nodeId = params.node?.data?.id
          if (!nodeId) return []
          const items = []
          if (onCopyNode) {
            items.push({ name: '复制', action: () => onCopyNode(nodeId) })
          }
          if (onPasteNode && canPaste) {
            items.push({ name: '粘贴到此处', action: () => onPasteNode(nodeId) })
          }
          if (onCloneNode) {
            items.push({
              name: '递归克隆子树',
              action: () => onCloneNode(nodeId),
            })
          }
          if (onViewProperties) {
            items.push({
              name: '查看属性',
              action: () => onViewProperties(nodeId),
            })
          }
          return items
        }}
      />
    </div>
  )
}
