import api from "@/services/api";
import { ApiResponse, RekapGaji, SlipGaji } from "@/types";

export async function getRekapByPeriode(idPeriode: number): Promise<RekapGaji[]> {
  const res = await api.get<ApiResponse<RekapGaji[]>>(
    `/payroll/gaji/periode/${idPeriode}`,
  );
  return res.data.data ?? [];
}

export async function getAllRekap(): Promise<RekapGaji[]> {
  const res = await api.get<ApiResponse<RekapGaji[]>>(`/payroll/gaji/rekap`);
  return res.data.data ?? [];
}

export async function getSlipById(idRekap: number): Promise<SlipGaji> {
  const res = await api.get<ApiResponse<SlipGaji>>(
    `/payroll/gaji/rekap/${idRekap}`,
  );
  return res.data.data;
}

export async function processPayroll(idPeriode: number): Promise<void> {
  await api.post(`/payroll/gaji/process/periode/${idPeriode}`);
}

import { parseNamaTanggalLahir, formatDate } from "@/lib/format";

export function exportRekapCsv(
  rekap: RekapGaji[],
  filename: string,
  periodeLabel?: string,
): void {
  // 1. KOP HEADER FORMAL SESUAI FOTO SHEET "RECAP"
  const titleRows = [
    ["REKAPITULASI GAJI"],
    ["SMK PSKD III"],
    [`Bulan : ${periodeLabel ? periodeLabel.toUpperCase() : "JUNI 2026"}`],
    [], // Baris Kosong
  ];

  // 2. HEADER KOLOM SESUAI FOTO SHEET "RECAP"
  const tableHeaders = [
    "NO",
    "NAMA GURU/PEGAWAI",
    "Jabatan",
    "HR. HDR",
    "GAJI KOPETENSI",
    "TUNJANGAN JABATAN DLL",
    "TRANSPORT/U. MAKAN 30000",
    "TOTAL PENGHASILAN",
    "JUMLAH POTONGAN",
    "TOTAL PENERIMAAN",
    "TANDA TANGAN",
  ];

  // 3. BARIS DATA PEGAWAI
  let sumGajiPokok = 0;
  let sumTunjangan = 0;
  let sumTransport = 0;
  let sumTotalBruto = 0;
  let sumPotongan = 0;
  let sumTotalNetto = 0;

  const dataRows = rekap.map((r, index) => {
    const { nama } = parseNamaTanggalLahir(r.nama_dan_tanggal_lahir ?? "");
    const hadirWfo = Number(r.total_hadir_wfo ?? 0);
    const gajiPokok = Number(r.gaji_pokok_snapshot ?? 0);
    const transport = Number(r.transport_uang_makan ?? 0);
    const totalBruto = Number(
      r.total_penghasilan_bruto ?? r.total_penerimaan_clean ?? 0,
    );
    const tunjanganDll = Number(
      r.tunjangan_jabatan_dll ?? Math.max(0, totalBruto - gajiPokok - transport),
    );
    const potongan = Number(r.total_potongan ?? r.total_potongan_clean ?? 0);
    const netto = Number(
      r.total_penerimaan_clean ?? r.netto_clean ?? totalBruto - potongan,
    );

    sumGajiPokok += gajiPokok;
    sumTunjangan += tunjanganDll;
    sumTransport += transport;
    sumTotalBruto += totalBruto;
    sumPotongan += potongan;
    sumTotalNetto += netto;

    return [
      index + 1,
      nama,
      r.jabatan_snapshot ?? "-",
      hadirWfo,
      gajiPokok,
      tunjanganDll,
      transport,
      totalBruto,
      potongan,
      netto,
      `${index + 1}. ....................`,
    ];
  });

  // 4. BARIS TOTAL AKHIR
  const totalRow = [
    "",
    "JUMLAH TOTAL",
    "",
    "",
    sumGajiPokok,
    sumTunjangan,
    sumTransport,
    sumTotalBruto,
    sumPotongan,
    sumTotalNetto,
    "",
  ];

  // 5. TANDA TANGAN DI BAWAH REKAP SESUAI STANDAR PSKD
  const signatureRows = [
    [],
    [],
    ["", "", "", "", "", "", "Mengetahui,", "", `Jakarta, ${formatDate(new Date())}`],
    ["", "", "", "", "", "", "Kepala Sekolah", "", "Bendahara / Staf Penggajian"],
    [],
    [],
    [],
    ["", "", "", "", "", "", "Thomas S.Pd., M.M.", "", "Bendahara Sekolah"],
  ];

  const allLines = [
    ...titleRows,
    tableHeaders,
    ...dataRows,
    totalRow,
    ...signatureRows,
  ];

  const csvContent = allLines
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? "");
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
