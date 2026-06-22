import * as XLSX from "xlsx";

/**
 * Konversi tanggal dari format Excel (serial number ATAU string DD/MM/YYYY) ke Date
 */
export function parseTanggalExcel(value: string | number | undefined): Date | null {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    // Excel serial date
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }

  // Format string DD/MM/YYYY
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return isNaN(date.getTime()) ? null : date;
}
