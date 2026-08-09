export function formatRupiah(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "0%";
  return `${value.toFixed(1)}%`;
}

export function parseNamaTanggalLahir(namaDanTgl: string): {
  nama: string;
  tanggalLahir: string;
} {
  const parts = namaDanTgl.split(",").map((s) => s.trim());
  if (parts.length >= 2) {
    return { nama: parts[0], tanggalLahir: parts.slice(1).join(", ") };
  }
  return { nama: namaDanTgl, tanggalLahir: "-" };
}
