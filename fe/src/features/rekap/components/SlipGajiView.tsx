import { SlipGaji } from "@/types";
import { formatRupiah, parseNamaTanggalLahir } from "@/lib/format";

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

  const totalBruto =
    Number(slip.gaji_pokok_snapshot ?? 0) +
    tunjangan.reduce((s, d) => s + Number(d.nilai), 0);
  const totalPotongan = potongan.reduce((s, d) => s + Number(d.nilai), 0);

  return (
    <div className="mx-auto max-w-4xl border-2 border-slate-800 bg-white p-8 font-mono text-sm print:border-black">
      <div className="border-b-2 border-slate-800 pb-4 text-center">
        <h1 className="text-xl font-bold tracking-widest">SLIP GAJI PEGAWAI</h1>
        {periodeLabel && (
          <p className="mt-1 text-slate-600">Periode: {periodeLabel}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 border-b border-slate-300 py-4">
        <div>
          <p>
            <span className="inline-block w-24">Nama</span>: {nama}
          </p>
          <p>
            <span className="inline-block w-24">Gol.</span>:{" "}
            {slip.golongan_snapshot}
          </p>
        </div>
        <div>
          <p>
            <span className="inline-block w-24">Jabatan</span>:{" "}
            {slip.jabatan_snapshot}
          </p>
          <p>
            <span className="inline-block w-24">Tgl Lahir</span>: {tanggalLahir}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-0 border-b border-slate-300">
        <div className="border-r border-slate-300 p-4">
          <h2 className="mb-3 border-b border-slate-400 pb-1 font-bold">
            PENERIMAAN (BRUTO)
          </h2>
          <div className="space-y-1">
            <Row label="Gaji Pokok" value={slip.gaji_pokok_snapshot} />
            {tunjangan.map((d) => (
              <Row key={d.id_detail} label={d.nama_komponen} value={d.nilai} />
            ))}
          </div>
          <div className="mt-4 border-t border-slate-400 pt-2 font-bold">
            <Row label="Total Penerimaan" value={totalBruto} bold />
          </div>
        </div>

        <div className="p-4">
          <h2 className="mb-3 border-b border-slate-400 pb-1 font-bold">
            POTONGAN
          </h2>
          <div className="space-y-1">
            {potongan.length === 0 ? (
              <p className="text-slate-400">—</p>
            ) : (
              potongan.map((d) => (
                <Row key={d.id_detail} label={d.nama_komponen} value={d.nilai} />
              ))
            )}
          </div>
          <div className="mt-4 border-t border-slate-400 pt-2 font-bold">
            <Row label="Total Potongan" value={totalPotongan} bold />
          </div>
        </div>
      </div>

      <div className="border-b-2 border-slate-800 py-6 text-center">
        <p className="text-sm font-semibold tracking-wide">
          GAJI BERSIH (NETTO)
        </p>
        <p className="mt-2 text-2xl font-bold">
          {formatRupiah(slip.netto_clean ?? totalBruto - totalPotongan)}
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value?: number;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span>{formatRupiah(value)}</span>
    </div>
  );
}
