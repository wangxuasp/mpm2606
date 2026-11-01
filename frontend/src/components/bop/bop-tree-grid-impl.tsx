'use client'

import { useCallback, useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ICellRendererParams } from 'ag-grid-community'
import {
  type ColDef,
  type GridReadyEvent,
  type RowDragEndEvent,
} from 'ag-grid-community'
import { GripVertical } from 'lucide-react'
import type { BopNode } from '@/lib/domain/types'
import '@/lib/ag-grid/setup'
import {
  findRowElementFromDragEvent,
  findRowIdFromDragEvent,
} from '@/components/bom-tree/bom-tree-utils'
import {
  readBomNodeIdFromDataTransfer,
  setPendingBomDrag,
  setTreeNodeDragPreview,
  writeBomNodeIdToDataTransfer,
} from '@/components/bom-tree/bom-drag-store'
import {
  buildBopTreeRows,
  LEVEL_LABELS,
  LIFECYCLE_LABELS,
  type BopTreeRow,
} from './bop-tree-utils'
import type { BopTreeGridProps } from './bop-tree-grid'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

function makeGroupCellRenderer(enableNativeDrag: boolean) {
  return function GroupCellRenderer(params: ICellRendererParams<BopTreeRow>) {
    const data = params.data
    if (!data) return null
    const label = (
      <span className="truncate">
        {data.code} — {data.name}
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

export function BopTreeGridImpl({
  nodes,
  rootId,
  readOnly = false,
  onNodeSelect,
  onRowDragEnd,
  dragSource = false,
  dropTarget = false,
  onExternalDrop,
  onCopyNode,
  onPasteNode,
  onCloneNode,
  onViewProperties,
  canPaste = false,
  multiSelect = false,
  onSelectionChanged,
}: BopTreeGridProps) {
  const gridRef = useRef<AgGridReact<BopTreeRow>>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropTargetRef = useRef<string | null>(null)

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
      if (dragSource || readOnly || !event.node.data) return
      const node = event.node.data
      if (node.lifecycleState === 'released') return
      const newParentId = event.overNode?.data?.id ?? rootId
      if (newParentId && node.id !== newParentId) {
        const newParent = event.overNode?.data
        if (newParent?.lifecycleState === 'released') return
        onRowDragEnd?.(node.id, newParentId)
      }
    },
    [dragSource, readOnly, rootId, onRowDragEnd],
  )

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      if (!dropTarget) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
      const nextTargetId = findRowIdFromDragEvent(event)
      if (dropTargetRef.current === nextTargetId) return
      containerRef.current
        ?.querySelectorAll('.mpms-tree-drop-target')
        .forEach((row) => row.classList.remove('mpms-tree-drop-target'))
      findRowElementFromDragEvent(event)?.classList.add('mpms-tree-drop-target')
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

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    const relatedTarget = event.relatedTarget
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return
    clearDropTarget()
  }, [clearDropTarget])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      if (!dropTarget) return
      event.preventDefault()
      const nodeId = readBomNodeIdFromDataTransfer(event.dataTransfer)
      if (!nodeId) return
      const targetParentId = findRowIdFromDragEvent(event) ?? dropTargetRef.current ?? rootId
      onExternalDrop?.(nodeId, targetParentId)
      setPendingBomDrag(null)
      clearDropTarget()
    },
    [dropTarget, rootId, onExternalDrop, clearDropTarget],
  )

  if (!rootId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        暂无 BOP 数据
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
        rowSelection={
          multiSelect
            ? { mode: 'multiRow', checkboxes: true, headerCheckbox: true }
            : undefined
        }
        onSelectionChanged={(event) => {
          if (!multiSelect || !onSelectionChanged) return
          onSelectionChanged(event.api.getSelectedRows())
        }}
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
