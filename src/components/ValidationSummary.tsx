import React, { useState } from 'react';

export default function ValidationSummary({
  errors,
  rowData,
  entityType,
  onApplyFix,
}: {
  errors: { row: number; col: string; message: string }[],
  rowData: any[],
  entityType: string,
  onApplyFix: (rowIdx: number, col: string, newValue: any) => void,
}) {
  const [fixes, setFixes] = useState<{ [key: string]: string }>({});
  const [loadingFix, setLoadingFix] = useState<{ [key: string]: boolean }>({});

  const handleSuggestFix = async (err: any) => {
    const key = `${err.row}-${err.col}`;
    setLoadingFix(lf => ({ ...lf, [key]: true }));
    try {
      const response = await fetch('/api/ai-error-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          row: err.row,
          col: err.col,
          value: rowData[err.row]?.[err.col],
          message: err.message,
          rowData: rowData[err.row],
          entityType,
        }),
      });
      const data = await response.json();
      if (data.suggestion !== undefined) {
        setFixes(f => ({ ...f, [key]: data.suggestion }));
      }
    } catch (e) {
      setFixes(f => ({ ...f, [key]: 'AI error' }));
    }
    setLoadingFix(lf => ({ ...lf, [key]: false }));
  };

  return (
    <div className="mt-2">
      {errors.length === 0 ? (
        <div className="text-green-700">No validation errors!</div>
      ) : (
        <ul className="text-red-700">
          {errors.map((err, idx) => {
            const key = `${err.row}-${err.col}`;
            return (
              <li key={idx} className="mb-1">
                Row {err.row + 1}, <b>{err.col}</b>: {err.message}
                <button
                  className="ml-2 text-xs bg-blue-200 px-2 py-1 rounded"
                  disabled={loadingFix[key]}
                  onClick={() => handleSuggestFix(err)}
                >
                  {loadingFix[key] ? 'Suggesting...' : 'Suggest Fix'}
                </button>
                {fixes[key] && fixes[key] !== 'AI error' && (
                  <>
                    <span className="ml-2 text-green-700">Suggestion: <b>{fixes[key]}</b></span>
                    <button
                      className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded"
                      onClick={() => onApplyFix(err.row, err.col, fixes[key])}
                    >
                      Apply
                    </button>
                  </>
                )}
                {fixes[key] === 'AI error' && (
                  <span className="ml-2 text-red-600">AI error</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
