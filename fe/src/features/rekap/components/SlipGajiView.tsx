import { SlipGaji } from "@/types";
import { formatRupiah, parseNamaTanggalLahir, formatDate } from "@/lib/format";

interface SlipGajiViewProps {
  slip: SlipGaji;
  periodeLabel?: string;
}

export function SlipGajiView({ slip, periodeLabel }: SlipGajiViewProps) {
  const { nama, tanggalLahir } = parseNamaTanggalLahir(
    slip.nama_dan_tanggal_lahir ?? "",
  );

  const tunjangan = (slip.details ?? []).filter(
    (d) => d.jenis_komponen === "TUNJANGAN",
  );
  const potongan = (slip.details ?? []).filter(
    (d) => d.jenis_komponen === "POTONGAN",
  );

  const gajiPokok = Number(slip.gaji_pokok_snapshot ?? 0);
  const totalTunjangan = tunjangan.reduce(
    (s, d) => s + Number(d.nilai_snapshot ?? d.nilai ?? 0),
    0,
  );
  const totalBruto =
    Number(slip.total_penghasilan_bruto ?? 0) ||
    gajiPokok + totalTunjangan;

  const totalPotongan =
    Number(slip.total_potongan ?? 0) ||
    potongan.reduce((s, d) => s + Number(d.nilai_snapshot ?? d.nilai ?? 0), 0);

  const totalNetto =
    Number(slip.total_penerimaan_clean ?? slip.netto_clean ?? 0) ||
    totalBruto - totalPotongan;

  return (
    <div className="mx-auto max-w-4xl border border-zinc-800 bg-zinc-900/90 text-zinc-100 p-8 rounded-xl shadow-none font-sans print:border-black print:bg-white print:text-black print:p-6 print:rounded-none print:shadow-none">
      {/* KOP RESMI SEKOLAH */}
      <div className="border-b border-zinc-800 print:border-zinc-800 pb-5 text-center">
        <h2 className="text-xs font-semibold tracking-widest uppercase text-zinc-400 print:text-zinc-800">
          YAYASAN PSKD
        </h2>
        <h1 className="text-xl font-bold tracking-wide text-zinc-100 print:text-black mt-0.5">
          SMK PSKD 3 JAKARTA
        </h1>
        <p className="text-[11px] text-zinc-400 print:text-zinc-600 mt-0.5">
          Jl. Kramat Raya No. 67, Jakarta Pusat • Telp. (021) 3902345
        </p>
        <div className="mt-3 inline-block px-3.5 py-1 rounded-full bg-zinc-850 border border-zinc-750 print:bg-zinc-100 print:border-zinc-300">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-200 print:text-black">
            SLIP GAJI PEGAWAI {periodeLabel ? `— ${periodeLabel}` : ""}
          </span>
        </div>
      </div>

      {/* INFORMASI PEGAWAI */}
      <div className="grid grid-cols-2 gap-4 border-b border-zinc-800/80 print:border-zinc-300 py-4 text-xs">
        <div className="space-y-1.5">
          <div className="flex">
            <span className="w-28 text-zinc-400 print:text-zinc-600">Nama Pegawai</span>
            <span className="font-semibold text-zinc-100 print:text-black">: {nama}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-zinc-400 print:text-zinc-600">Golongan / Pangkat</span>
            <span className="text-zinc-200 print:text-black">
              : {slip.pangkat_golongan_snapshot || slip.golongan_snapshot || "-"}
            </span>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex">
            <span className="w-28 text-zinc-400 print:text-zinc-600">Jabatan</span>
            <span className="font-semibold text-zinc-200 print:text-black">
              : {slip.jabatan_snapshot || "-"}
            </span>
          </div>
          <div className="flex">
            <span className="w-28 text-zinc-400 print:text-zinc-600">Tanggal Lahir</span>
            <span className="text-zinc-200 print:text-black">: {tanggalLahir}</span>
          </div>
        </div>
      </div>

      {/* RINCIAN PENERIMAAN & POTONGAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-b border-zinc-800/80 print:border-zinc-300">
        {/* KOLOM KIRI: PENERIMAAN (BRUTO) */}
        <div className="p-4 md:border-r border-zinc-800/80 print:border-zinc-300">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 print:text-zinc-700 border-b border-zinc-800/80 print:border-zinc-300 pb-2 mb-3">
            (+) Penerimaan (Penghasilan Bruto)
          </h3>
          <div className="space-y-2 text-xs">
            <Row label="Gaji Pokok Dasar" value={gajiPokok} />
            {tunjangan.map((d) => (
              <Row
                key={d.id_rekap_detail ?? d.id_detail}
                label={d.nama_komponen_snapshot ?? d.nama_komponen ?? "Tunjangan"}
                value={d.nilai_snapshot ?? d.nilai}
              />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/80 print:border-zinc-300">
            <Row
              label="Total Penghasilan Bruto"
              value={totalBruto}
              bold
              className="text-zinc-100 print:text-black"
            />
          </div>
        </div>

        {/* KOLOM KANAN: POTONGAN */}
        <div className="p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 print:text-zinc-700 border-b border-zinc-800/80 print:border-zinc-300 pb-2 mb-3">
            (-) Potongan (Taken List & Kas)
          </h3>
          <div className="space-y-2 text-xs">
            {potongan.length === 0 ? (
              <p className="text-zinc-500 italic">Tidak ada potongan bulan ini</p>
            ) : (
              potongan.map((d) => (
                <Row
                  key={d.id_rekap_detail ?? d.id_detail}
                  label={d.nama_komponen_snapshot ?? d.nama_komponen ?? "Potongan"}
                  value={d.nilai_snapshot ?? d.nilai}
                />
              ))
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/80 print:border-zinc-300">
            <Row
              label="Total Potongan"
              value={totalPotongan}
              bold
              className="text-zinc-200 print:text-black"
            />
          </div>
        </div>
      </div>

      {/* TOTAL GAJI BERSIH (NETTO) */}
      <div className="p-6 bg-zinc-950 print:bg-zinc-100 rounded-xl mt-4 border border-zinc-800 print:border-zinc-300 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 print:text-zinc-600">
          TOTAL GAJI BERSIH DITERIMA (TAKE HOME PAY)
        </p>
        <p className="text-2xl font-bold font-mono tabular-nums text-zinc-100 print:text-black mt-1">
          {formatRupiah(totalNetto)}
        </p>
      </div>

      {/* TANDA TANGAN */}
      <div className="grid grid-cols-2 gap-8 pt-8 mt-6 text-center text-xs border-t border-zinc-800/80 print:border-zinc-300">
        <div>
          <p className="text-zinc-400 print:text-zinc-600">Mengetahui,</p>
          <p className="font-semibold text-zinc-200 print:text-black">Kepala Sekolah</p>
          <div className="h-16 flex items-end justify-center">
            <p className="font-bold text-zinc-100 print:text-black underline">
              Thomas S.Pd., M.M.
            </p>
          </div>
        </div>
        <div>
          <p className="text-zinc-400 print:text-zinc-600">Jakarta, {formatDate(new Date())}</p>
          <p className="font-semibold text-zinc-200 print:text-black">Staf Keuangan & Penggajian</p>
          <div className="h-16 flex items-end justify-center">
            <p className="font-bold text-zinc-100 print:text-black underline">
              Bendahara Sekolah
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  className = "",
}: {
  label: string;
  value?: number | string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex justify-between items-center ${
        bold ? "font-bold" : ""
      } ${className}`}
    >
      <span className="text-slate-300 print:text-slate-700">{label}</span>
      <span className="font-mono font-medium">{formatRupiah(value)}</span>
    </div>
  );
}
