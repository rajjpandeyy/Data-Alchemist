// components/headerMapping.ts
export function mapHeaders(headers: string[], schema: string[]): Record<string, string | null> {
  return headers.reduce((acc, header) => {
    // Simple case-insensitive match, can be replaced with fuzzy logic if needed
    const match = schema.find(col => col.toLowerCase() === header.toLowerCase());
    acc[header] = match || null;
    return acc;
  }, {} as Record<string, string | null>);
}
