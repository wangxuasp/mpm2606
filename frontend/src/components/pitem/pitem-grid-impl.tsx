'use client'

import { useCallback, useMemo, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { type ColDef, type GridReadyEvent } from 'ag-grid-community'
import type { Pitem } from '@/lib/api/pitem-client'
import '@/lib/ag-grid/setup'

import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'

export interface PitemGridImplProps {
  rowData: Pitem[]
}

const PITEM_PAGE_SIZE = 100

export function PitemGridImpl({ rowData }: PitemGridImplProps) {
  const gridRef = useRef<AgGridReact<Pitem>>(null)

  const columnDefs = useMemo<ColDef<Pitem>[]>(
    () => [
      {
        field: 'puid',
        headerName: 'PUID',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'pitemId',
        headerName: 'PITEM ID',
        flex: 1,
        minWidth: 160,
      },
    ],
    [],
  )

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    [],
  )

  const onGridReady = useCallback((event: GridReadyEvent<Pitem>) => {
    event.api.sizeColumnsToFit()
  }, [])

  return (
    <div className="ag-theme-quartz h-full w-full">
      <AgGridReact<Pitem>
        ref={gridRef}
        theme="legacy"
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={(params) => params.data.puid}
        animateRows
        pagination
        paginationPageSize={PITEM_PAGE_SIZE}
        paginationPageSizeSelector={[PITEM_PAGE_SIZE]}
        onGridReady={onGridReady}
      />
    </div>
  )
}
