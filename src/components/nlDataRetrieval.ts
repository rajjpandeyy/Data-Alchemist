// components/nlDataRetrieval.ts
export function nlDataRetrieval(query: string, data: any[]): any[] {
  // Supports queries like: Duration > 1, PriorityLevel = 3, etc.
  const pattern = /(\w+)\s*(>=|<=|=|>|<)\s*(\d+)/;
  const match = query.trim().match(pattern);
  if (!match) return [];
  const [, field, op, valueStr] = match;
  const value = parseInt(valueStr, 10);

  return data.filter(row => {
    const cellValue = parseInt(row[field], 10);
    if (isNaN(cellValue)) return false;
    if (op === '>') return cellValue > value;
    if (op === '<') return cellValue < value;
    if (op === '=') return cellValue === value;
    if (op === '>=') return cellValue >= value;
    if (op === '<=') return cellValue <= value;
    return false;
  });
}

