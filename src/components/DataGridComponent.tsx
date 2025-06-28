'use client';

// --- Register all required ag-Grid modules ---
import { ModuleRegistry } from 'ag-grid-community';
import { ClientSideRowModelModule } from 'ag-grid-community';
import { CellStyleModule } from 'ag-grid-community';
import { ValidationModule } from 'ag-grid-enterprise';
import { TextEditorModule } from 'ag-grid-enterprise';
import { NumberEditorModule } from 'ag-grid-enterprise';

// Register all modules needed for editing and validation
ModuleRegistry.registerModules([
  CellStyleModule,
  ClientSideRowModelModule,
  ValidationModule,
  TextEditorModule,
  NumberEditorModule,
]);

import React, { useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface DataGridProps {
  rowData: any[];
  columnDefs: any[];
  onCellValueChanged?: (params: any) => void;
  title: string;
  errors: { row: number; col: string; message: string }[];
}

export default function DataGridComponent({
  rowData,
  columnDefs,
  onCellValueChanged,
  title,
  errors,
}: DataGridProps) {
  const getCellClass = useCallback(
    (params: any) => {
      const hasError = errors.some(
        (err) => err.row === params.rowIndex && err.col === params.colDef.field
      );
      return hasError ? 'ag-cell-error' : '';
    },
    [errors]
  );

  const defaultColDef = useMemo(
    () => ({
      flex: 1,
      minWidth: 100,
      editable: true, // ✅ Make all cells editable by default
      resizable: true,
      cellClass: getCellClass,
    }),
    [getCellClass]
  );

  return (
    <div className="my-4">
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onCellValueChanged={onCellValueChanged}
          singleClickEdit={true} // ✅ Enable single-click editing!
        />
      </div>
    </div>
  );
}
